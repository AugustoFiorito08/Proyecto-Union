using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Application.Validators;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Solicitudes;

/// <summary>
/// Implementación de <see cref="ISolicitudMembresiaService"/> (SPEC.md §5 "Solicitudes de
/// Membresía", Etapa 6). Vive en Infrastructure porque necesita UserManager/RoleManager de
/// Identity — mismo criterio arquitectónico que ComunicacionService/PagoService/
/// ControlAccesoService (lógica de negocio con acceso directo a ApplicationDbContext,
/// implementada en Infrastructure e inyectada vía su interfaz de Application).
/// </summary>
public class SolicitudMembresiaService : ISolicitudMembresiaService
{
    private const string RolNoSocio = "NoSocio";
    private const string RolSocio = "Socio";

    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;

    public SolicitudMembresiaService(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
    }

    public async Task<ResultadoSolicitudMembresia> CrearAsync(CrearSolicitudMembresiaRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre) || string.IsNullOrWhiteSpace(request.Apellido)
            || string.IsNullOrWhiteSpace(request.DNI) || string.IsNullOrWhiteSpace(request.Email))
        {
            return ResultadoSolicitudMembresia.Invalido("Nombre, Apellido, DNI y Email son obligatorios.");
        }

        // RN-LOG-01 (SPEC.md §3.10). El validador de FluentValidation ya corta esto antes de
        // llegar acá vía HTTP (CrearSolicitudMembresiaRequestValidator); se repite acá porque
        // el servicio también se llama directo desde los tests de integración, sin pasar por
        // el pipeline de FluentValidationAutoValidation.
        if (!PasswordPolicyValidator.CumplePolitica(request.Password))
        {
            return ResultadoSolicitudMembresia.Invalido(
                $"La contraseña debe tener al menos {PasswordPolicyValidator.LongitudMinima} caracteres e incluir mayúscula, minúscula y número.");
        }

        // RN-SOC-02/RF-SOL-04 (SPEC.md §3.13): unicidad cruzada de DNI contra Socio y contra
        // solicitudes Pendientes (el constraint filtrado de SolicitudMembresiaConfiguration
        // cubre la carrera concurrente; esta validación da el mensaje 400 claro en el caso común).
        var existeSocioDni = await _dbContext.Socios.AnyAsync(s => s.DNI == request.DNI, cancellationToken);
        var existeSolicitudPendienteDni = await _dbContext.SolicitudesMembresia.AnyAsync(
            s => s.DNI == request.DNI && s.Estado == EstadoSolicitudMembresia.Pendiente, cancellationToken);

        if (existeSocioDni || existeSolicitudPendienteDni)
        {
            return ResultadoSolicitudMembresia.Invalido("Ya existe un socio o una solicitud pendiente con ese DNI.");
        }

        var existeSocioEmail = await _dbContext.Socios.AnyAsync(s => s.Email == request.Email, cancellationToken);
        var existeSolicitudPendienteEmail = await _dbContext.SolicitudesMembresia.AnyAsync(
            s => s.Email == request.Email && s.Estado == EstadoSolicitudMembresia.Pendiente, cancellationToken);
        var existeUsuarioEmail = await _userManager.FindByEmailAsync(request.Email) is not null;

        if (existeSocioEmail || existeSolicitudPendienteEmail || existeUsuarioEmail)
        {
            return ResultadoSolicitudMembresia.Invalido("Ya existe un socio, un usuario o una solicitud pendiente con ese email.");
        }

        if (request.CategoriaPretendidaId.HasValue
            && !await _dbContext.Categorias.AnyAsync(c => c.Id == request.CategoriaPretendidaId.Value, cancellationToken))
        {
            return ResultadoSolicitudMembresia.Invalido("La categoría pretendida indicada no existe.");
        }

        var rolNoSocio = await _roleManager.FindByNameAsync(RolNoSocio);
        if (rolNoSocio is null)
        {
            return ResultadoSolicitudMembresia.Invalido("El rol NoSocio no está sembrado en el sistema.");
        }

        var usuario = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            RolId = rolNoSocio.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        var resultadoUsuario = await _userManager.CreateAsync(usuario, request.Password);
        if (!resultadoUsuario.Succeeded)
        {
            return ResultadoSolicitudMembresia.Invalido(string.Join("; ", resultadoUsuario.Errors.Select(e => e.Description)));
        }

        var solicitud = new SolicitudMembresia
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            NumeroSolicitud = await GenerarNumeroSolicitudAsync(cancellationToken),
            Nombre = request.Nombre,
            Apellido = request.Apellido,
            DNI = request.DNI,
            FechaNacimiento = DateTime.SpecifyKind(request.FechaNacimiento, DateTimeKind.Utc),
            Genero = request.Genero,
            Email = request.Email,
            Telefono = request.Telefono,
            Domicilio = request.Domicilio,
            Localidad = request.Localidad,
            Provincia = request.Provincia,
            CategoriaPretendidaId = request.CategoriaPretendidaId,
            Estado = EstadoSolicitudMembresia.Pendiente,
            FechaSolicitud = DateTime.UtcNow
        };

        _dbContext.SolicitudesMembresia.Add(solicitud);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ResultadoSolicitudMembresia.Ok(solicitud.Id);
    }

    public async Task<ResultadoSolicitudMembresia> ActualizarObservacionesAsync(Guid id, string? observaciones, CancellationToken cancellationToken)
    {
        var solicitud = await _dbContext.SolicitudesMembresia.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return ResultadoSolicitudMembresia.NoEncontrado("La solicitud indicada no existe.");
        }

        if (solicitud.Estado != EstadoSolicitudMembresia.Pendiente)
        {
            return ResultadoSolicitudMembresia.Conflicto("Solo se pueden editar observaciones de una solicitud en estado Pendiente.");
        }

        solicitud.Observaciones = observaciones;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ResultadoSolicitudMembresia.Ok(solicitud.Id);
    }

    public async Task<ResultadoSolicitudMembresia> AprobarAsync(Guid id, CancellationToken cancellationToken)
    {
        var solicitud = await _dbContext.SolicitudesMembresia.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return ResultadoSolicitudMembresia.NoEncontrado("La solicitud indicada no existe.");
        }

        if (solicitud.Estado != EstadoSolicitudMembresia.Pendiente)
        {
            return ResultadoSolicitudMembresia.Conflicto("Solo se puede aprobar una solicitud en estado Pendiente.");
        }

        // Doble chequeo al momento de aprobar: pudo haberse dado de alta otro socio con el
        // mismo DNI/Email entre la fecha de la solicitud y su aprobación.
        if (await _dbContext.Socios.AnyAsync(s => s.DNI == solicitud.DNI, cancellationToken))
        {
            return ResultadoSolicitudMembresia.Conflicto("Ya existe un socio con ese DNI.");
        }

        if (await _dbContext.Socios.AnyAsync(s => s.Email == solicitud.Email, cancellationToken))
        {
            return ResultadoSolicitudMembresia.Conflicto("Ya existe un socio con ese email.");
        }

        Guid categoriaId;
        if (solicitud.CategoriaPretendidaId.HasValue)
        {
            categoriaId = solicitud.CategoriaPretendidaId.Value;
        }
        else
        {
            // Decisión de implementación (no especificada en SPEC.md, que no define un
            // concepto de "categoría default"): si el solicitante no eligió categoría
            // pretendida, se asigna la primera Categoria con Estado=Activo ordenada por
            // Nombre. Extender Categoria con un flag "EsDefault" queda fuera de alcance de
            // esta etapa (no lo pide el enunciado ni el checklist de Etapa 6).
            var categoriaDefault = await _dbContext.Categorias
                .Where(c => c.Estado == EstadoCategoria.Activo)
                .OrderBy(c => c.Nombre)
                .FirstOrDefaultAsync(cancellationToken);

            if (categoriaDefault is null)
            {
                return ResultadoSolicitudMembresia.Conflicto("No hay categorías activas para asignar al nuevo socio.");
            }

            categoriaId = categoriaDefault.Id;
        }

        var usuario = await _userManager.FindByIdAsync(solicitud.UsuarioId.ToString());
        if (usuario is null)
        {
            return ResultadoSolicitudMembresia.Conflicto("El usuario asociado a la solicitud ya no existe.");
        }

        var rolSocio = await _roleManager.FindByNameAsync(RolSocio);
        if (rolSocio is null)
        {
            return ResultadoSolicitudMembresia.Conflicto("El rol Socio no está sembrado en el sistema.");
        }

        var socio = new Socio
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            NumeroSocio = await GenerarNumeroSocioAsync(cancellationToken),
            Apellido = solicitud.Apellido,
            Nombres = solicitud.Nombre,
            DNI = solicitud.DNI,
            FechaNacimiento = solicitud.FechaNacimiento,
            Genero = solicitud.Genero,
            TipoPago = TipoPago.Mensual,
            CategoriaId = categoriaId,
            Telefono = solicitud.Telefono,
            Email = solicitud.Email,
            Domicilio = solicitud.Domicilio,
            Localidad = solicitud.Localidad,
            Provincia = solicitud.Provincia,
            // Decisión de implementación: SolicitudMembresia no recolecta un campo "Foto"
            // separado (RF-SOL-05 solo pide documento de identidad y ficha médica) —
            // DocumentoIdentidadUrl es lo más parecido disponible y se copia a Socio.FotoUrl.
            // SolicitudMembresia.FichaMedicaUrl NO se copia: Socio modela la ficha médica como
            // datos estructurados + vencimiento (ObservacionesMedicas/GrupoSanguineo/
            // FichaMedicaFechaEmision/Vencimiento), no como archivo, y no tiene un campo de URL
            // equivalente — queda pendiente de carga manual por backoffice después del alta
            // (gap a documentar para una futura extensión de Socio).
            FotoUrl = solicitud.DocumentoIdentidadUrl,
            Modalidad = ModalidadSocio.SecretariaWeb,
            Estado = EstadoSocio.Activo,
            FechaAlta = DateTime.UtcNow,
            FechaUltimaModificacion = DateTime.UtcNow,
            CodigoQr = await GenerarCodigoQrUnicoAsync(cancellationToken)
        };

        _dbContext.Socios.Add(socio);

        // Reasigna el rol del MISMO ApplicationUser (no crea uno nuevo) de NoSocio a Socio.
        usuario.RolId = rolSocio.Id;
        var resultadoRol = await _userManager.UpdateAsync(usuario);
        if (!resultadoRol.Succeeded)
        {
            return ResultadoSolicitudMembresia.Conflicto(string.Join("; ", resultadoRol.Errors.Select(e => e.Description)));
        }

        solicitud.Estado = EstadoSolicitudMembresia.Aprobada;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ResultadoSolicitudMembresia.Ok(solicitud.Id, socio.Id);
    }

    public async Task<ResultadoSolicitudMembresia> RechazarAsync(Guid id, string motivoRechazo, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(motivoRechazo))
        {
            return ResultadoSolicitudMembresia.Invalido("El motivo de rechazo es obligatorio.");
        }

        var solicitud = await _dbContext.SolicitudesMembresia.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return ResultadoSolicitudMembresia.NoEncontrado("La solicitud indicada no existe.");
        }

        if (solicitud.Estado != EstadoSolicitudMembresia.Pendiente)
        {
            return ResultadoSolicitudMembresia.Conflicto("Solo se puede rechazar una solicitud en estado Pendiente.");
        }

        solicitud.Estado = EstadoSolicitudMembresia.Rechazada;
        solicitud.MotivoRechazo = motivoRechazo;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ResultadoSolicitudMembresia.Ok(solicitud.Id);
    }

    /// <summary>
    /// Decisión de implementación (no 100% especificada en SPEC.md, mismo criterio que
    /// SociosController.GenerarNumeroSocioAsync): correlativo "SOL-" + 6 dígitos según la
    /// cantidad actual de solicitudes. No es estrictamente atómico bajo alta concurrencia
    /// (aceptable para el volumen de un club).
    /// </summary>
    private async Task<string> GenerarNumeroSolicitudAsync(CancellationToken cancellationToken)
    {
        var total = await _dbContext.SolicitudesMembresia.CountAsync(cancellationToken);
        return $"SOL-{(total + 1):D6}";
    }

    /// <summary>Mismo criterio que SociosController.GenerarNumeroSocioAsync (no compartido para no acoplar API/Infrastructure).</summary>
    private async Task<string> GenerarNumeroSocioAsync(CancellationToken cancellationToken)
    {
        var total = await _dbContext.Socios.CountAsync(cancellationToken);
        return $"S{(total + 1):D6}";
    }

    /// <summary>Mismo criterio que SociosController.GenerarCodigoQrUnicoAsync (RN-ACC-05, SPEC.md §3.1).</summary>
    private async Task<string> GenerarCodigoQrUnicoAsync(CancellationToken cancellationToken)
    {
        string codigo;
        do
        {
            codigo = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        }
        while (await _dbContext.Socios.AnyAsync(s => s.CodigoQr == codigo, cancellationToken));

        return codigo;
    }
}
