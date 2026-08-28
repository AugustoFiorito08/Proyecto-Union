using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Dtos.Comunicaciones;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Implementación de <see cref="IComunicacionService"/> (Etapa 4). Cada método público hace
/// un único flujo de <c>SaveChangesAsync</c> por operación, mismo criterio que
/// <c>PagoService</c> (Etapa 3).
/// </summary>
public class ComunicacionService : IComunicacionService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IEmailSender _emailSender;
    private readonly IWhatsAppSender _whatsAppSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ComunicacionService> _logger;

    public ComunicacionService(
        ApplicationDbContext dbContext,
        IEmailSender emailSender,
        IWhatsAppSender whatsAppSender,
        IConfiguration configuration,
        ILogger<ComunicacionService> logger)
    {
        _dbContext = dbContext;
        _emailSender = emailSender;
        _whatsAppSender = whatsAppSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Socio>> ResolverDestinatariosAsync(SegmentoDestinatariosRequest segmento, CancellationToken cancellationToken)
    {
        var camposActivos = new[]
        {
            segmento.Todos,
            segmento.CategoriaId.HasValue,
            segmento.GrupoFamiliarId.HasValue,
            segmento.SocioIds is { Length: > 0 }
        }.Count(activo => activo);

        if (camposActivos != 1)
        {
            throw new ArgumentException("Debe indicar exactamente uno de Todos, CategoriaId, GrupoFamiliarId o SocioIds.");
        }

        var query = _dbContext.Socios
            .AsNoTracking()
            .Where(s => s.Estado == EstadoSocio.Activo && s.UsuarioId != null);

        if (segmento.CategoriaId.HasValue)
        {
            query = query.Where(s => s.CategoriaId == segmento.CategoriaId.Value);
        }
        else if (segmento.GrupoFamiliarId.HasValue)
        {
            query = query.Where(s => s.GrupoFamiliarId == segmento.GrupoFamiliarId.Value);
        }
        else if (segmento.SocioIds is { Length: > 0 })
        {
            query = query.Where(s => segmento.SocioIds.Contains(s.Id));
        }
        // segmento.Todos: sin filtro adicional.

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<ResultadoComunicacion> CrearComunicacionAsync(CrearComunicacionRequest request, Guid creadoPorUsuarioId, CancellationToken cancellationToken)
    {
        var validacion = await ValidarYResolverAsync(request.Asunto, request.ContenidoHtml, request.TipoComunicacion, request.Segmento, request.Canales, cancellationToken);
        if (validacion.Error is not null)
        {
            return validacion.Error;
        }

        var comunicacion = new Comunicacion
        {
            Id = Guid.NewGuid(),
            Asunto = request.Asunto,
            Descripcion = request.Descripcion,
            ContenidoHtml = request.ContenidoHtml,
            TipoComunicacion = validacion.Tipo,
            Estado = EstadoComunicacion.Borrador,
            CreadoPorUsuarioId = creadoPorUsuarioId,
            FechaCreacion = DateTime.UtcNow
        };

        _dbContext.Comunicaciones.Add(comunicacion);
        AgregarDestinatarios(comunicacion, validacion.Socios, validacion.Canales);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoComunicacion.Ok(comunicacion.Id);
    }

    public async Task<ResultadoComunicacion> ActualizarComunicacionAsync(Guid comunicacionId, ActualizarComunicacionRequest request, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones
            .Include(c => c.Destinatarios)
            .FirstOrDefaultAsync(c => c.Id == comunicacionId, cancellationToken);

        if (comunicacion is null)
        {
            return ResultadoComunicacion.NoEncontrado("La comunicación indicada no existe.");
        }

        if (comunicacion.Estado != EstadoComunicacion.Borrador)
        {
            return ResultadoComunicacion.Conflicto("Solo se puede editar una comunicación en estado Borrador.");
        }

        var validacion = await ValidarYResolverAsync(request.Asunto, request.ContenidoHtml, request.TipoComunicacion, request.Segmento, request.Canales, cancellationToken);
        if (validacion.Error is not null)
        {
            return validacion.Error;
        }

        comunicacion.Asunto = request.Asunto;
        comunicacion.Descripcion = request.Descripcion;
        comunicacion.ContenidoHtml = request.ContenidoHtml;
        comunicacion.TipoComunicacion = validacion.Tipo;

        _dbContext.ComunicacionesDestinatarios.RemoveRange(comunicacion.Destinatarios);
        comunicacion.Destinatarios.Clear();
        AgregarDestinatarios(comunicacion, validacion.Socios, validacion.Canales);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoComunicacion.Ok(comunicacion.Id);
    }

    public async Task<ResultadoComunicacion> EnviarAsync(Guid comunicacionId, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones
            .Include(c => c.Destinatarios).ThenInclude(d => d.Usuario)
            .FirstOrDefaultAsync(c => c.Id == comunicacionId, cancellationToken);

        if (comunicacion is null)
        {
            return ResultadoComunicacion.NoEncontrado("La comunicación indicada no existe.");
        }

        var pendientes = comunicacion.Destinatarios.Where(d => d.EstadoEnvio == EstadoEnvioComunicacion.Pendiente).ToList();
        if (pendientes.Count > 0)
        {
            var usuarioIds = pendientes.Select(d => d.UsuarioId).Distinct().ToList();
            var sociosPorUsuarioId = await _dbContext.Socios
                .AsNoTracking()
                .Where(s => s.UsuarioId != null && usuarioIds.Contains(s.UsuarioId!.Value))
                .ToDictionaryAsync(s => s.UsuarioId!.Value, cancellationToken);

            var appBaseUrl = (_configuration["AppBaseUrl"] ?? "http://localhost:5000").TrimEnd('/');

            foreach (var destinatario in pendientes)
            {
                await EnviarADestinatarioAsync(comunicacion, destinatario, sociosPorUsuarioId, appBaseUrl, cancellationToken);
            }
        }

        comunicacion.Estado = EstadoComunicacion.Enviada;
        comunicacion.FechaUltimoEnvio = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoComunicacion.Ok(comunicacion.Id);
    }

    public async Task<ResultadoComunicacion> ProgramarAsync(Guid comunicacionId, DateTime fechaProgramada, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones.FirstOrDefaultAsync(c => c.Id == comunicacionId, cancellationToken);
        if (comunicacion is null)
        {
            return ResultadoComunicacion.NoEncontrado("La comunicación indicada no existe.");
        }

        if (comunicacion.Estado != EstadoComunicacion.Borrador)
        {
            return ResultadoComunicacion.Conflicto("Solo se puede programar una comunicación en estado Borrador.");
        }

        comunicacion.FechaProgramada = DateTime.SpecifyKind(fechaProgramada, DateTimeKind.Utc);
        comunicacion.Estado = EstadoComunicacion.Programada;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoComunicacion.Ok(comunicacion.Id);
    }

    public async Task<Comunicacion?> CrearYEnviarASocioAsync(
        Guid socioId,
        string asunto,
        string contenidoHtml,
        TipoComunicacion tipoComunicacion,
        IReadOnlyCollection<CanalComunicacion> canales,
        Guid? creadoPorUsuarioId,
        CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.AsNoTracking().FirstOrDefaultAsync(s => s.Id == socioId, cancellationToken);
        if (socio?.UsuarioId is null)
        {
            return null;
        }

        var creador = creadoPorUsuarioId ?? await ResolverUsuarioSistemaAsync(cancellationToken);
        if (creador is null)
        {
            _logger.LogError("No se pudo resolver un usuario creador de sistema (SuperAdministrador) para la comunicación automática de Socio {SocioId}.", socioId);
            return null;
        }

        var comunicacion = new Comunicacion
        {
            Id = Guid.NewGuid(),
            Asunto = asunto,
            ContenidoHtml = contenidoHtml,
            TipoComunicacion = tipoComunicacion,
            Estado = EstadoComunicacion.Borrador,
            CreadoPorUsuarioId = creador.Value,
            FechaCreacion = DateTime.UtcNow
        };

        _dbContext.Comunicaciones.Add(comunicacion);
        AgregarDestinatarios(comunicacion, new[] { socio }, canales);

        await _dbContext.SaveChangesAsync(cancellationToken);
        await EnviarAsync(comunicacion.Id, cancellationToken);

        return comunicacion;
    }

    // ---- Helpers internos ----

    private sealed record ValidacionCreacion(
        ResultadoComunicacion? Error,
        TipoComunicacion Tipo,
        IReadOnlyList<CanalComunicacion> Canales,
        IReadOnlyList<Socio> Socios);

    private async Task<ValidacionCreacion> ValidarYResolverAsync(
        string asunto,
        string contenidoHtml,
        int tipoComunicacion,
        SegmentoDestinatariosRequest segmento,
        int[] canales,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(asunto) || string.IsNullOrWhiteSpace(contenidoHtml))
        {
            return new ValidacionCreacion(ResultadoComunicacion.Invalido("Asunto y ContenidoHtml son obligatorios."), default, [], []);
        }

        if (!Enum.IsDefined(typeof(TipoComunicacion), tipoComunicacion))
        {
            return new ValidacionCreacion(ResultadoComunicacion.Invalido("TipoComunicacion inválido."), default, [], []);
        }

        if (canales is not { Length: > 0 } || canales.Any(c => !Enum.IsDefined(typeof(CanalComunicacion), c)))
        {
            return new ValidacionCreacion(ResultadoComunicacion.Invalido("Debe indicar al menos un Canal válido."), default, [], []);
        }

        IReadOnlyList<Socio> socios;
        try
        {
            socios = await ResolverDestinatariosAsync(segmento, cancellationToken);
        }
        catch (ArgumentException ex)
        {
            return new ValidacionCreacion(ResultadoComunicacion.Invalido(ex.Message), default, [], []);
        }

        if (socios.Count == 0)
        {
            return new ValidacionCreacion(ResultadoComunicacion.Invalido("El segmento indicado no tiene destinatarios con cuenta propia."), default, [], []);
        }

        var canalesDistintos = canales.Select(c => (CanalComunicacion)c).Distinct().ToList();
        return new ValidacionCreacion(null, (TipoComunicacion)tipoComunicacion, canalesDistintos, socios);
    }

    private static void AgregarDestinatarios(Comunicacion comunicacion, IReadOnlyList<Socio> socios, IReadOnlyCollection<CanalComunicacion> canales)
    {
        foreach (var socio in socios)
        {
            if (socio.UsuarioId is not { } usuarioId)
            {
                continue;
            }

            foreach (var canal in canales)
            {
                comunicacion.Destinatarios.Add(new ComunicacionDestinatario
                {
                    Id = Guid.NewGuid(),
                    ComunicacionId = comunicacion.Id,
                    UsuarioId = usuarioId,
                    Canal = canal,
                    EstadoEnvio = EstadoEnvioComunicacion.Pendiente
                });
            }
        }
    }

    private async Task EnviarADestinatarioAsync(
        Comunicacion comunicacion,
        ComunicacionDestinatario destinatario,
        IReadOnlyDictionary<Guid, Socio> sociosPorUsuarioId,
        string appBaseUrl,
        CancellationToken cancellationToken)
    {
        try
        {
            switch (destinatario.Canal)
            {
                case CanalComunicacion.Novedad:
                    destinatario.EstadoEnvio = EstadoEnvioComunicacion.Enviado;
                    destinatario.FechaEnvio = DateTime.UtcNow;
                    break;

                case CanalComunicacion.Email:
                    if (destinatario.Usuario?.Email is not { Length: > 0 } email)
                    {
                        throw new InvalidOperationException("El usuario destinatario no tiene email configurado.");
                    }

                    var htmlConPixel = InyectarPixelDeTracking(comunicacion.ContenidoHtml, destinatario.Id, appBaseUrl);
                    await _emailSender.EnviarAsync(email, comunicacion.Asunto, htmlConPixel, cancellationToken);
                    destinatario.EstadoEnvio = EstadoEnvioComunicacion.Enviado;
                    destinatario.FechaEnvio = DateTime.UtcNow;
                    break;

                case CanalComunicacion.WhatsApp:
                    if (!sociosPorUsuarioId.TryGetValue(destinatario.UsuarioId, out var socio) ||
                        string.IsNullOrWhiteSpace(socio.Celular) && string.IsNullOrWhiteSpace(socio.Telefono))
                    {
                        throw new InvalidOperationException("El socio destinatario no tiene un teléfono configurado.");
                    }

                    var telefono = !string.IsNullOrWhiteSpace(socio.Celular) ? socio.Celular! : socio.Telefono!;
                    var mensajeTexto = $"{comunicacion.Asunto}\n\n{ConvertirHtmlATexto(comunicacion.ContenidoHtml)}";
                    await _whatsAppSender.EnviarAsync(telefono, mensajeTexto, cancellationToken);
                    destinatario.EstadoEnvio = EstadoEnvioComunicacion.Enviado;
                    destinatario.FechaEnvio = DateTime.UtcNow;
                    break;
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            destinatario.EstadoEnvio = EstadoEnvioComunicacion.Fallido;
            destinatario.MotivoFallo = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
            _logger.LogWarning(ex, "Falló el envío de la comunicación {ComunicacionId} al destinatario {DestinatarioId} (canal {Canal}).",
                comunicacion.Id, destinatario.Id, destinatario.Canal);
        }
    }

    /// <summary>
    /// Decisión de implementación: usuario "creador" para comunicaciones automáticas
    /// (cumpleaños, recordatorio de vencimiento, aviso de suspensión) que no tienen un
    /// usuario staff detrás. Comunicacion.CreadoPorUsuarioId es NOT NULL (SPEC.md §4.2), así
    /// que se atribuyen al SuperAdministrador sembrado en Etapa 0.
    /// </summary>
    private async Task<Guid?> ResolverUsuarioSistemaAsync(CancellationToken cancellationToken)
    {
        var usuario = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == DbSeeder.SuperAdminEmail, cancellationToken);

        return usuario?.Id;
    }

    private static string InyectarPixelDeTracking(string contenidoHtml, Guid destinatarioId, string appBaseUrl)
    {
        var pixel = $"<img src=\"{appBaseUrl}/api/comunicaciones/tracking/{destinatarioId}.png\" width=\"1\" height=\"1\" alt=\"\" />";

        var indiceBodyClose = contenidoHtml.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return indiceBodyClose >= 0
            ? contenidoHtml.Insert(indiceBodyClose, pixel)
            : contenidoHtml + pixel;
    }

    private static string ConvertirHtmlATexto(string html)
    {
        var sinTags = Regex.Replace(html, "<.*?>", string.Empty, RegexOptions.Singleline);
        return System.Net.WebUtility.HtmlDecode(sinTags).Trim();
    }
}
