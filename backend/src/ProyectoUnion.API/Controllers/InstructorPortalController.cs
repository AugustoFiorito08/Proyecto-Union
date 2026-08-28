using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Actividades;
using ProyectoUnion.Application.Dtos.InstructorPortal;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Mini-portal del Instructor (SPEC.md §5 "Portal del Instructor", §2.2: Actividades L
/// "propias"). Resuelve "propias" a partir del <c>ApplicationUser</c> autenticado (busca su
/// <see cref="Instructor"/> por <c>UsuarioId</c>, luego las Actividades/Divisiones donde
/// aparece en <c>ActividadInstructor</c>/<c>DivisionInstructor</c>).
///
/// No usa policy de permiso por módulo (eso es para staff, "actividades.leer"): un
/// Instructor no tiene permisos de módulo asignados (ver SPEC.md §2.2 y DbSeeder). El
/// enunciado de esta tarea sugiere <c>[Authorize(Roles = "Instructor")]</c>, pero
/// JwtTokenService NO emite un claim <c>ClaimTypes.Role</c> (solo el claim propio
/// <see cref="ProyectoUnionClaimTypes.RolNombre"/> "rol_nombre" — ver DbSeeder, que
/// deliberadamente no usa <c>UserManager.AddToRoleAsync</c>), así que un atributo Roles=
/// literal nunca autorizaría a nadie. Se valida el rol contra ese claim propio en su lugar
/// (mismo patrón que <c>PermissionAuthorizationHandler</c> con el claim "permiso").
/// </summary>
[ApiController]
[Route("api/instructor")]
[Authorize]
public class InstructorPortalController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public InstructorPortalController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("actividades")]
    public async Task<ActionResult<IReadOnlyList<ActividadInstructorPortalResponse>>> MisActividades(CancellationToken cancellationToken)
    {
        var instructor = await ResolverInstructorActualAsync(cancellationToken);
        if (instructor is null)
        {
            return Forbid();
        }

        var resultado = new List<ActividadInstructorPortalResponse>();

        // Asignación directa a nivel Actividad (actividades sin divisiones, o el "todo" de
        // una actividad con divisiones).
        var actividadesDirectas = await _dbContext.ActividadInstructores
            .AsNoTracking()
            .Where(ai => ai.InstructorId == instructor.Id)
            .Select(ai => ai.Actividad)
            .ToListAsync(cancellationToken);

        foreach (var actividad in actividadesDirectas)
        {
            var cupoOcupado = await _dbContext.Inscripciones
                .CountAsync(i => i.ActividadId == actividad.Id && i.DivisionDeportivaId == null && i.Estado == EstadoInscripcion.Activa, cancellationToken);

            resultado.Add(new ActividadInstructorPortalResponse(
                actividad.Id, actividad.Nombre, actividad.Dias, actividad.HorarioInicio, actividad.HorarioFin,
                actividad.Estado.ToString(), actividad.CupoMaximo, cupoOcupado, null, null));
        }

        // Asignación a nivel División (RN-ACT-02, §3.17).
        var divisiones = await _dbContext.DivisionInstructores
            .AsNoTracking()
            .Include(di => di.DivisionDeportiva).ThenInclude(d => d.Actividad)
            .Where(di => di.InstructorId == instructor.Id)
            .Select(di => di.DivisionDeportiva)
            .ToListAsync(cancellationToken);

        foreach (var division in divisiones)
        {
            var cupoOcupado = await _dbContext.Inscripciones
                .CountAsync(i => i.DivisionDeportivaId == division.Id && i.Estado == EstadoInscripcion.Activa, cancellationToken);

            resultado.Add(new ActividadInstructorPortalResponse(
                division.Actividad.Id, division.Actividad.Nombre, division.Dias, division.HorarioInicio, division.HorarioFin,
                division.Estado.ToString(), division.Actividad.CupoMaximo, cupoOcupado, division.Id, division.Nombre));
        }

        return Ok(resultado);
    }

    [HttpGet("actividades/{id:guid}/inscriptos")]
    public async Task<ActionResult<IReadOnlyList<InscripcionResponse>>> InscriptosDeMiActividad(Guid id, CancellationToken cancellationToken)
    {
        var instructor = await ResolverInstructorActualAsync(cancellationToken);
        if (instructor is null)
        {
            return Forbid();
        }

        var esPropia = await EsActividadPropiaAsync(instructor.Id, id, cancellationToken);
        if (!esPropia)
        {
            return Forbid();
        }

        var inscripciones = await _dbContext.Inscripciones
            .AsNoTracking()
            .Include(i => i.Socio)
            .Include(i => i.Actividad)
            .Include(i => i.DivisionDeportiva)
            .Where(i => i.ActividadId == id)
            .OrderBy(i => i.Socio.Apellido).ThenBy(i => i.Socio.Nombres)
            .Select(i => new InscripcionResponse(
                i.Id, i.SocioId, i.Socio.Apellido + ", " + i.Socio.Nombres, i.ActividadId, i.Actividad.Nombre,
                i.DivisionDeportivaId, i.DivisionDeportiva == null ? null : i.DivisionDeportiva.Nombre,
                i.FechaInscripcion, i.Estado.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(inscripciones);
    }

    private async Task<bool> EsActividadPropiaAsync(Guid instructorId, Guid actividadId, CancellationToken cancellationToken)
    {
        var directa = await _dbContext.ActividadInstructores
            .AnyAsync(ai => ai.InstructorId == instructorId && ai.ActividadId == actividadId, cancellationToken);
        if (directa)
        {
            return true;
        }

        return await _dbContext.DivisionInstructores
            .AnyAsync(di => di.InstructorId == instructorId && di.DivisionDeportiva.ActividadId == actividadId, cancellationToken);
    }

    private async Task<Instructor?> ResolverInstructorActualAsync(CancellationToken cancellationToken)
    {
        var rolNombre = User.FindFirst(ProyectoUnionClaimTypes.RolNombre)?.Value;
        if (!string.Equals(rolNombre, "Instructor", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (usuarioId is null || !Guid.TryParse(usuarioId, out var usuarioGuid))
        {
            return null;
        }

        return await _dbContext.Instructores.FirstOrDefaultAsync(i => i.UsuarioId == usuarioGuid, cancellationToken);
    }
}
