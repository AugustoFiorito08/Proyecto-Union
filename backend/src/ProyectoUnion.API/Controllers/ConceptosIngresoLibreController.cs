using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.ConceptosIngresoLibre;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM del catálogo de ConceptoIngresoLibre (SPEC.md §5 "CRUD
/// /api/configuracion/conceptos-ingreso-libre", §4.2 "ConceptoIngresoLibre", RN-FIN-09
/// §3.20) — mismo patrón exacto que AmenitiesController (Etapa 2), con Estado en vez de baja
/// física (para no invalidar Pagos históricos que ya referencian el concepto).
/// </summary>
[ApiController]
[Route("api/configuracion/conceptos-ingreso-libre")]
[Authorize]
public class ConceptosIngresoLibreController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ConceptosIngresoLibreController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "conceptos-ingreso-libre.leer")]
    public async Task<ActionResult<IReadOnlyList<ConceptoIngresoLibreResponse>>> Listar(CancellationToken cancellationToken)
    {
        var conceptos = await _dbContext.ConceptosIngresoLibre
            .AsNoTracking()
            .OrderBy(c => c.Nombre)
            .ToListAsync(cancellationToken);

        return Ok(conceptos.Select(MapearAResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "conceptos-ingreso-libre.leer")]
    public async Task<ActionResult<ConceptoIngresoLibreResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var concepto = await _dbContext.ConceptosIngresoLibre.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (concepto is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(concepto));
    }

    [HttpPost]
    [Authorize(Policy = "conceptos-ingreso-libre.crear")]
    public async Task<ActionResult<ConceptoIngresoLibreResponse>> Crear([FromBody] ConceptoIngresoLibreRequest request, CancellationToken cancellationToken)
    {
        if (await _dbContext.ConceptosIngresoLibre.AnyAsync(c => c.Nombre == request.Nombre, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe un concepto de ingreso libre con ese nombre." });
        }

        var concepto = new ConceptoIngresoLibre
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Estado = EstadoConceptoIngresoLibre.Activo
        };

        _dbContext.ConceptosIngresoLibre.Add(concepto);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = MapearAResponse(concepto);
        return CreatedAtAction(nameof(Obtener), new { id = concepto.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "conceptos-ingreso-libre.editar")]
    public async Task<ActionResult<ConceptoIngresoLibreResponse>> Actualizar(
        Guid id, [FromBody] ConceptoIngresoLibreRequest request, CancellationToken cancellationToken)
    {
        var concepto = await _dbContext.ConceptosIngresoLibre.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (concepto is null)
        {
            return NotFound();
        }

        if (await _dbContext.ConceptosIngresoLibre.AnyAsync(c => c.Nombre == request.Nombre && c.Id != id, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe otro concepto de ingreso libre con ese nombre." });
        }

        concepto.Nombre = request.Nombre;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapearAResponse(concepto));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "conceptos-ingreso-libre.baja")]
    public async Task<IActionResult> Baja(Guid id, CancellationToken cancellationToken)
    {
        var concepto = await _dbContext.ConceptosIngresoLibre.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (concepto is null)
        {
            return NotFound();
        }

        concepto.Estado = EstadoConceptoIngresoLibre.Inactivo;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static ConceptoIngresoLibreResponse MapearAResponse(ConceptoIngresoLibre c) => new(c.Id, c.Nombre, c.Estado.ToString());
}
