using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Consultas;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Consultas del Socio hacia el club — dirección inversa a Comunicacion (SPEC.md §5
/// "Consultas del Socio", NUEVO-SPEC-UI). Vista de staff; el alta y la consulta propia del
/// Socio viven en <c>MePortalController</c> (<c>GET/POST /api/me/consultas</c>).
/// </summary>
[ApiController]
[Route("api/consultas")]
[Authorize]
public class ConsultasController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ConsultasController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "consultas.leer")]
    public async Task<ActionResult<PagedResult<ConsultaSocioResponse>>> Listar(
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = ConsultasConIncludes();

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoConsulta)estado.Value;
            query = query.Where(c => c.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var consultas = await query
            .OrderByDescending(c => c.FechaCreacion)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<ConsultaSocioResponse>(consultas.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    [HttpPut("{id:guid}/responder")]
    [Authorize(Policy = "consultas.editar")]
    public async Task<ActionResult<ConsultaSocioResponse>> Responder(Guid id, [FromBody] ResponderConsultaRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Respuesta))
        {
            return BadRequest(new { message = "La respuesta no puede estar vacía." });
        }

        var usuarioIdTexto = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(usuarioIdTexto, out var usuarioId))
        {
            return Unauthorized();
        }

        var consulta = await _dbContext.ConsultasSocio.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (consulta is null)
        {
            return NotFound();
        }

        consulta.Respuesta = request.Respuesta;
        consulta.Estado = EstadoConsulta.Respondida;
        consulta.RespondidoPorUsuarioId = usuarioId;
        consulta.FechaRespuesta = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var consultaActualizada = await ConsultasConIncludes().FirstAsync(c => c.Id == id, cancellationToken);
        return Ok(MapearAResponse(consultaActualizada));
    }

    private IQueryable<ConsultaSocio> ConsultasConIncludes() =>
        _dbContext.ConsultasSocio
            .AsNoTracking()
            .Include(c => c.Socio)
            .Include(c => c.RespondidoPorUsuario);

    private static ConsultaSocioResponse MapearAResponse(ConsultaSocio c) => new(
        c.Id,
        c.SocioId,
        c.Socio is not null ? $"{c.Socio.Apellido}, {c.Socio.Nombres}" : string.Empty,
        c.Area,
        c.Asunto,
        c.Detalle,
        c.AdjuntoUrl,
        c.Estado.ToString(),
        c.FechaCreacion,
        c.RespondidoPorUsuarioId,
        c.RespondidoPorUsuario?.Email,
        c.FechaRespuesta,
        c.Respuesta);
}
