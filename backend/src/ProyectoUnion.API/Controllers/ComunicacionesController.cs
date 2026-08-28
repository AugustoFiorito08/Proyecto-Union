using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Comunicaciones;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM y envío de Comunicaciones (SPEC.md §5 "Comunicaciones", Etapa 4). El módulo entero es
/// de staff (matriz §2.2: Socio solo tiene "L (recibidas)", resuelto en
/// <c>MePortalController</c>, no acá).
/// </summary>
[ApiController]
[Route("api/comunicaciones")]
[Authorize]
public class ComunicacionesController : ControllerBase
{
    private const int MaxAdjuntosPorComunicacion = 5;

    // PNG transparente de 1x1 (RN de tracking de lectura, NUEVO-SPEC-UI) — se sirve siempre,
    // nunca 404, para no delatar al remitente si el pixel fue bloqueado por el cliente.
    private static readonly byte[] PixelTransparentePng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");

    private readonly ApplicationDbContext _dbContext;
    private readonly IComunicacionService _comunicacionService;
    private readonly IArchivoStorageService _archivoStorageService;

    public ComunicacionesController(
        ApplicationDbContext dbContext,
        IComunicacionService comunicacionService,
        IArchivoStorageService archivoStorageService)
    {
        _dbContext = dbContext;
        _comunicacionService = comunicacionService;
        _archivoStorageService = archivoStorageService;
    }

    [HttpGet]
    [Authorize(Policy = "comunicaciones.leer")]
    public async Task<ActionResult<PagedResult<ComunicacionResponse>>> Listar(
        [FromQuery] string? tab,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = ComunicacionesConIncludes();

        query = tab?.Trim().ToLowerInvariant() switch
        {
            "enviados" => query.Where(c => c.Estado == EstadoComunicacion.Enviada),
            "borradores" => query.Where(c => c.Estado == EstadoComunicacion.Borrador),
            "programados" => query.Where(c => c.Estado == EstadoComunicacion.Programada),
            _ => query
        };

        var total = await query.CountAsync(cancellationToken);

        var comunicaciones = await query
            .OrderByDescending(c => c.FechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<ComunicacionResponse>(comunicaciones.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    /// <summary>
    /// Detalle de una Comunicacion. No estaba en la lista original de endpoints de SPEC.md §5,
    /// pero `/comunicaciones/{id}/editar` (§7.1) lo necesita para prefillear el wizard al
    /// editar un borrador — mismo criterio que otros huecos ya cerrados en Etapas 1-3 (ej.
    /// `GET /api/me/espacios` en Etapa 2).
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "comunicaciones.leer")]
    public async Task<ActionResult<ComunicacionResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var comunicacion = await ComunicacionesConIncludes().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (comunicacion is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(comunicacion));
    }

    [HttpPost]
    [Authorize(Policy = "comunicaciones.crear")]
    public async Task<ActionResult<ComunicacionResponse>> Crear([FromBody] CrearComunicacionRequest request, CancellationToken cancellationToken)
    {
        var usuarioId = ObtenerUsuarioIdActual();
        if (usuarioId is null)
        {
            return Unauthorized();
        }

        var resultado = await _comunicacionService.CrearComunicacionAsync(request, usuarioId.Value, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "comunicaciones.editar")]
    public async Task<ActionResult<ComunicacionResponse>> Actualizar(Guid id, [FromBody] ActualizarComunicacionRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _comunicacionService.ActualizarComunicacionAsync(id, request, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    /// <summary>
    /// Solo Borrador (SPEC.md §5); sin permiso para Empleado según la matriz §2.2
    /// ("Comunicaciones: CLM (sin eliminar)" para Empleado/Secretaría) — por eso la policy es
    /// "comunicaciones.baja", que DbSeeder solo asigna a SuperAdmin/Administrador.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "comunicaciones.baja")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (comunicacion is null)
        {
            return NotFound();
        }

        if (comunicacion.Estado != EstadoComunicacion.Borrador)
        {
            return Conflict(new { message = "Solo se puede eliminar una comunicación en estado Borrador." });
        }

        _dbContext.Comunicaciones.Remove(comunicacion);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/enviar")]
    [Authorize(Policy = "comunicaciones.editar")]
    public async Task<ActionResult<ComunicacionResponse>> Enviar(Guid id, CancellationToken cancellationToken)
    {
        var resultado = await _comunicacionService.EnviarAsync(id, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    [HttpPost("{id:guid}/programar")]
    [Authorize(Policy = "comunicaciones.editar")]
    public async Task<ActionResult<ComunicacionResponse>> Programar(Guid id, [FromBody] ProgramarComunicacionRequest request, CancellationToken cancellationToken)
    {
        var fechaUtc = DateTime.SpecifyKind(request.FechaProgramada, DateTimeKind.Utc);
        var resultado = await _comunicacionService.ProgramarAsync(id, fechaUtc, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    /// <summary>Hasta 5 adjuntos por comunicación (SPEC.md §4.2 "ComunicacionAdjunto", validado acá).</summary>
    [HttpPost("{id:guid}/adjuntos")]
    [Authorize(Policy = "comunicaciones.editar")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<IReadOnlyList<ComunicacionAdjuntoResponse>>> SubirAdjuntos(Guid id, [FromForm] IFormFileCollection archivos, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones
            .Include(c => c.Adjuntos)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (comunicacion is null)
        {
            return NotFound();
        }

        if (comunicacion.Estado != EstadoComunicacion.Borrador)
        {
            return Conflict(new { message = "Solo se pueden agregar adjuntos a una comunicación en estado Borrador." });
        }

        if (archivos is null || archivos.Count == 0)
        {
            return BadRequest(new { message = "Debe adjuntar al menos un archivo." });
        }

        if (comunicacion.Adjuntos.Count + archivos.Count > MaxAdjuntosPorComunicacion)
        {
            return BadRequest(new { message = $"Una comunicación admite hasta {MaxAdjuntosPorComunicacion} adjuntos." });
        }

        var nuevos = new List<ComunicacionAdjunto>();
        foreach (var archivo in archivos)
        {
            await using var stream = archivo.OpenReadStream();
            var clave = await _archivoStorageService.SubirArchivoAsync(archivo.FileName, stream, archivo.ContentType, cancellationToken);
            var url = await _archivoStorageService.ObtenerUrlAsync(clave, cancellationToken);

            var adjunto = new ComunicacionAdjunto
            {
                Id = Guid.NewGuid(),
                ComunicacionId = comunicacion.Id,
                ArchivoUrl = url,
                NombreArchivo = archivo.FileName
            };

            _dbContext.ComunicacionesAdjuntos.Add(adjunto);
            nuevos.Add(adjunto);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(nuevos.Select(a => new ComunicacionAdjuntoResponse(a.Id, a.ArchivoUrl, a.NombreArchivo)).ToList());
    }

    [HttpGet("{id:guid}/trazabilidad")]
    [Authorize(Policy = "comunicaciones.leer")]
    public async Task<ActionResult<ComunicacionTrazabilidadResponse>> Trazabilidad(Guid id, CancellationToken cancellationToken)
    {
        var comunicacion = await _dbContext.Comunicaciones
            .AsNoTracking()
            .Include(c => c.Destinatarios).ThenInclude(d => d.Usuario)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (comunicacion is null)
        {
            return NotFound();
        }

        var usuarioIds = comunicacion.Destinatarios.Select(d => d.UsuarioId).Distinct().ToList();
        var sociosPorUsuarioId = await _dbContext.Socios
            .AsNoTracking()
            .Where(s => s.UsuarioId != null && usuarioIds.Contains(s.UsuarioId!.Value))
            .ToDictionaryAsync(s => s.UsuarioId!.Value, cancellationToken);

        var destinatarios = comunicacion.Destinatarios.Select(d =>
        {
            sociosPorUsuarioId.TryGetValue(d.UsuarioId, out var socio);
            return new ComunicacionDestinatarioResponse(
                d.Id,
                d.UsuarioId,
                socio?.Id,
                socio is not null ? $"{socio.Apellido}, {socio.Nombres}" : null,
                d.Canal.ToString(),
                d.EstadoEnvio.ToString(),
                d.FechaEnvio,
                d.FechaLectura,
                d.MotivoFallo);
        }).ToList();

        return Ok(new ComunicacionTrazabilidadResponse(comunicacion.Id, comunicacion.Asunto, comunicacion.Estado.ToString(), destinatarios));
    }

    /// <summary>
    /// Pixel de tracking de lectura de Email (NUEVO-SPEC-UI, ver
    /// <see cref="IComunicacionService"/>). Siempre devuelve el PNG, exista o no el
    /// destinatario, para no revelar información por el código de respuesta.
    /// </summary>
    [HttpGet("tracking/{destinatarioId:guid}.png")]
    [AllowAnonymous]
    public async Task<IActionResult> Tracking(Guid destinatarioId, CancellationToken cancellationToken)
    {
        var destinatario = await _dbContext.ComunicacionesDestinatarios.FirstOrDefaultAsync(d => d.Id == destinatarioId, cancellationToken);
        if (destinatario is not null && destinatario.FechaLectura is null)
        {
            destinatario.FechaLectura = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return File(PixelTransparentePng, "image/png");
    }

    private async Task<ActionResult<ComunicacionResponse>> MapearResultadoAsync(ResultadoComunicacion resultado, CancellationToken cancellationToken)
    {
        switch (resultado.Estado)
        {
            case ResultadoComunicacionEstado.Invalido:
                return BadRequest(new { message = resultado.Mensaje });
            case ResultadoComunicacionEstado.NoEncontrado:
                return NotFound(new { message = resultado.Mensaje });
            case ResultadoComunicacionEstado.Conflicto:
                return Conflict(new { message = resultado.Mensaje });
        }

        var comunicacion = await ComunicacionesConIncludes().FirstAsync(c => c.Id == resultado.ComunicacionId!.Value, cancellationToken);
        return Ok(MapearAResponse(comunicacion));
    }

    private Guid? ObtenerUsuarioIdActual()
    {
        var usuarioId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(usuarioId, out var guid) ? guid : null;
    }

    private IQueryable<Comunicacion> ComunicacionesConIncludes() =>
        _dbContext.Comunicaciones
            .AsNoTracking()
            .Include(c => c.CreadoPorUsuario)
            .Include(c => c.Destinatarios)
            .Include(c => c.Adjuntos);

    private static ComunicacionResponse MapearAResponse(Comunicacion c) => new(
        c.Id,
        c.Asunto,
        c.Descripcion,
        c.ContenidoHtml,
        c.TipoComunicacion.ToString(),
        c.Estado.ToString(),
        c.FechaProgramada,
        c.CreadoPorUsuarioId,
        c.CreadoPorUsuario?.Email,
        c.FechaCreacion,
        c.FechaUltimoEnvio,
        c.Destinatarios.Count,
        c.Adjuntos.Count);
}
