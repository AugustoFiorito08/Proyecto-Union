using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Solicitudes de Membresía y su ciclo de vida (SPEC.md §5 "Solicitudes de Membresía", §4.2
/// "SolicitudMembresia", Etapa 6). Primer módulo con endpoints [AllowAnonymous] reales (alta
/// pública + adjuntos) — mismo cuidado de validación estricta y límites de tamaño que el resto
/// de la superficie autenticada, tratando el input del cliente como no confiable (enunciado de
/// la tarea).
///
/// Matriz de permisos §2.2, fila "Solicitudes de Membresía" + nota al pie: SuperAdmin/
/// Administrador tienen CLMB completo; Empleado/Secretaría puede leer y "revisar y adjuntar
/// observaciones" (PUT) pero NUNCA aprobar/rechazar (acción irreversible con impacto en
/// facturación) — de ahí que "solicitudes-membresia.aprobar"/".rechazar" solo se sembren para
/// SuperAdministrador/Administrador (ver DbSeeder).
/// </summary>
[ApiController]
[Route("api/solicitudes-membresia")]
[Authorize]
public class SolicitudesMembresiaController : ControllerBase
{
    private const int MaxTamanioAdjuntos = 20_000_000;

    private readonly ApplicationDbContext _dbContext;
    private readonly ISolicitudMembresiaService _solicitudMembresiaService;
    private readonly IArchivoStorageService _archivoStorageService;

    public SolicitudesMembresiaController(
        ApplicationDbContext dbContext,
        ISolicitudMembresiaService solicitudMembresiaService,
        IArchivoStorageService archivoStorageService)
    {
        _dbContext = dbContext;
        _solicitudMembresiaService = solicitudMembresiaService;
        _archivoStorageService = archivoStorageService;
    }

    /// <summary>Alta pública de una Solicitud de Membresía (SPEC.md §5, RF-SOL-01 a RF-SOL-04).</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<SolicitudMembresiaResponse>> Crear(
        [FromBody] CrearSolicitudMembresiaRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _solicitudMembresiaService.CrearAsync(request, cancellationToken);
        if (resultado.Estado != ResultadoSolicitudMembresiaEstado.Ok)
        {
            return MapearError<SolicitudMembresiaResponse>(resultado);
        }

        var solicitud = await ObtenerConIncludes(resultado.SolicitudId!.Value, cancellationToken);
        return CreatedAtAction(nameof(Obtener), new { id = solicitud!.Id }, MapearAResponse(solicitud));
    }

    /// <summary>
    /// Sube documento de identidad y/o ficha médica de una solicitud (SPEC.md §5, RF-SOL-05).
    /// [AllowAnonymous] por diseño (enunciado de la tarea): en el momento en que el solicitante
    /// completa el formulario público todavía no inició sesión con la cuenta recién creada, así
    /// que no hay JWT disponible para autenticar esta llamada. Se identifica la solicitud por
    /// su Id (GUID no adivinable) y solo se acepta mientras está en Estado=Pendiente — una vez
    /// aprobada/rechazada, este endpoint deja de aceptar cambios.
    /// </summary>
    [HttpPost("{id:guid}/adjuntos")]
    [AllowAnonymous]
    [RequestSizeLimit(MaxTamanioAdjuntos)]
    public async Task<ActionResult<AdjuntosSolicitudMembresiaResponse>> SubirAdjuntos(
        Guid id,
        [FromForm] IFormFile? documentoIdentidad,
        [FromForm] IFormFile? fichaMedica,
        CancellationToken cancellationToken)
    {
        var solicitud = await _dbContext.SolicitudesMembresia.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return NotFound();
        }

        if (solicitud.Estado != EstadoSolicitudMembresia.Pendiente)
        {
            return Conflict(new { message = "Solo se pueden agregar adjuntos a una solicitud en estado Pendiente." });
        }

        if (documentoIdentidad is null && fichaMedica is null)
        {
            return BadRequest(new { message = "Debe adjuntar al menos un archivo (documentoIdentidad y/o fichaMedica)." });
        }

        if (documentoIdentidad is not null)
        {
            solicitud.DocumentoIdentidadUrl = await SubirArchivoAsync(documentoIdentidad, cancellationToken);
        }

        if (fichaMedica is not null)
        {
            solicitud.FichaMedicaUrl = await SubirArchivoAsync(fichaMedica, cancellationToken);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new AdjuntosSolicitudMembresiaResponse(solicitud.Id, solicitud.DocumentoIdentidadUrl, solicitud.FichaMedicaUrl));
    }

    [HttpGet]
    [Authorize(Policy = "solicitudes-membresia.leer")]
    public async Task<ActionResult<PagedResult<SolicitudMembresiaResponse>>> Listar(
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = SolicitudesConIncludes();

        if (estado.HasValue)
        {
            if (!Enum.IsDefined(typeof(EstadoSolicitudMembresia), estado.Value))
            {
                return BadRequest(new { message = "Estado inválido." });
            }

            var estadoFiltro = (EstadoSolicitudMembresia)estado.Value;
            query = query.Where(s => s.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var solicitudes = await query
            .OrderByDescending(s => s.FechaSolicitud)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<SolicitudMembresiaResponse>(solicitudes.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    /// <summary>
    /// Detalle de una solicitud para el staff (usado también internamente por Crear vía
    /// CreatedAtAction). No está en el listado literal de endpoints de SPEC.md §5, mismo
    /// criterio que otros huecos ya cerrados en etapas previas (ej. GET
    /// /api/comunicaciones/{id}).
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = "solicitudes-membresia.leer")]
    public async Task<ActionResult<SolicitudMembresiaResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var solicitud = await SolicitudesConIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(solicitud));
    }

    /// <summary>
    /// Seguimiento del solicitante (SPEC.md §5, matriz §2.2: No Socio "Propio (C/L)").
    /// [Authorize] simple (cualquier usuario autenticado) — la pertenencia se valida acá contra
    /// SolicitudMembresia.UsuarioId, mismo criterio que ResolverSocioActualAsync en
    /// MePortalController, para que un No Socio nunca pueda ver el seguimiento de otro.
    /// </summary>
    [HttpGet("{id:guid}/seguimiento")]
    public async Task<ActionResult<SolicitudMembresiaResponse>> Seguimiento(Guid id, CancellationToken cancellationToken)
    {
        var usuarioId = ObtenerUsuarioIdActual();
        if (usuarioId is null)
        {
            return Unauthorized();
        }

        var solicitud = await SolicitudesConIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (solicitud is null)
        {
            return NotFound();
        }

        if (solicitud.UsuarioId != usuarioId.Value)
        {
            return Forbid();
        }

        return Ok(MapearAResponse(solicitud));
    }

    /// <summary>
    /// Empleado/Secretaría "revisa y adjunta observaciones" (matriz §2.2, nota al pie) —
    /// también disponible para Administrador/SuperAdmin vía la misma policy.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "solicitudes-membresia.editar")]
    public async Task<ActionResult<SolicitudMembresiaResponse>> Actualizar(
        Guid id, [FromBody] ActualizarSolicitudMembresiaRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _solicitudMembresiaService.ActualizarObservacionesAsync(id, request.Observaciones, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    /// <summary>
    /// Aprobación (RF-SOL-13): irreversible, da de alta un Socio real. Solo Administrador/
    /// SuperAdmin (matriz §2.2, nota al pie) — Empleado NO tiene esta policy sembrada.
    /// </summary>
    [HttpPost("{id:guid}/aprobar")]
    [Authorize(Policy = "solicitudes-membresia.aprobar")]
    public async Task<ActionResult<AprobarSolicitudMembresiaResponse>> Aprobar(Guid id, CancellationToken cancellationToken)
    {
        var resultado = await _solicitudMembresiaService.AprobarAsync(id, cancellationToken);
        if (resultado.Estado != ResultadoSolicitudMembresiaEstado.Ok)
        {
            return MapearError<AprobarSolicitudMembresiaResponse>(resultado);
        }

        var socio = await _dbContext.Socios.AsNoTracking().FirstAsync(s => s.Id == resultado.SocioId!.Value, cancellationToken);
        return Ok(new AprobarSolicitudMembresiaResponse(resultado.SolicitudId!.Value, nameof(EstadoSolicitudMembresia.Aprobada), socio.Id, socio.NumeroSocio));
    }

    /// <summary>Rechazo: solo Administrador/SuperAdmin (matriz §2.2, nota al pie).</summary>
    [HttpPost("{id:guid}/rechazar")]
    [Authorize(Policy = "solicitudes-membresia.rechazar")]
    public async Task<ActionResult<SolicitudMembresiaResponse>> Rechazar(
        Guid id, [FromBody] RechazarSolicitudMembresiaRequest request, CancellationToken cancellationToken)
    {
        var resultado = await _solicitudMembresiaService.RechazarAsync(id, request.MotivoRechazo, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    private async Task<string> SubirArchivoAsync(IFormFile archivo, CancellationToken cancellationToken)
    {
        await using var stream = archivo.OpenReadStream();
        var clave = await _archivoStorageService.SubirArchivoAsync(archivo.FileName, stream, archivo.ContentType, cancellationToken);
        return await _archivoStorageService.ObtenerUrlAsync(clave, cancellationToken);
    }

    private async Task<ActionResult<SolicitudMembresiaResponse>> MapearResultadoAsync(ResultadoSolicitudMembresia resultado, CancellationToken cancellationToken)
    {
        if (resultado.Estado != ResultadoSolicitudMembresiaEstado.Ok)
        {
            return MapearError<SolicitudMembresiaResponse>(resultado);
        }

        var solicitud = await SolicitudesConIncludes().FirstAsync(s => s.Id == resultado.SolicitudId!.Value, cancellationToken);
        return Ok(MapearAResponse(solicitud));
    }

    private ActionResult<T> MapearError<T>(ResultadoSolicitudMembresia resultado) => resultado.Estado switch
    {
        ResultadoSolicitudMembresiaEstado.Invalido => BadRequest(new { message = resultado.Mensaje }),
        ResultadoSolicitudMembresiaEstado.NoEncontrado => NotFound(new { message = resultado.Mensaje }),
        ResultadoSolicitudMembresiaEstado.Conflicto => Conflict(new { message = resultado.Mensaje }),
        _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = resultado.Mensaje })
    };

    private Guid? ObtenerUsuarioIdActual()
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(usuarioId, out var guid) ? guid : null;
    }

    private IQueryable<SolicitudMembresia> SolicitudesConIncludes() =>
        _dbContext.SolicitudesMembresia
            .AsNoTracking()
            .Include(s => s.CategoriaPretendida);

    private Task<SolicitudMembresia?> ObtenerConIncludes(Guid id, CancellationToken cancellationToken) =>
        SolicitudesConIncludes().FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    private static SolicitudMembresiaResponse MapearAResponse(SolicitudMembresia s) => new(
        s.Id,
        s.NumeroSolicitud,
        s.UsuarioId,
        s.Nombre,
        s.Apellido,
        s.DNI,
        s.FechaNacimiento,
        s.Genero,
        s.Email,
        s.Telefono,
        s.Domicilio,
        s.Localidad,
        s.Provincia,
        s.CategoriaPretendidaId,
        s.CategoriaPretendida?.Nombre,
        s.DocumentoIdentidadUrl,
        s.FichaMedicaUrl,
        s.Estado.ToString(),
        s.MotivoRechazo,
        s.Observaciones,
        s.FechaSolicitud);
}
