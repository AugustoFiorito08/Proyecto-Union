using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.CoberturasMedicas;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Coberturas Médicas y sus Planes (SPEC.md §5 "CRUD /api/configuracion/coberturas-medicas"
/// + "CRUD .../{id}/planes", §4.2 "CoberturaMedica"/"Plan"). Bajas lógicas (Estado=Inactivo).
/// </summary>
[ApiController]
[Route("api/configuracion/coberturas-medicas")]
[Authorize]
public class CoberturasMedicasController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public CoberturasMedicasController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "coberturas-medicas.leer")]
    public async Task<ActionResult<IReadOnlyList<CoberturaMedicaResponse>>> Listar(CancellationToken cancellationToken)
    {
        var coberturas = await _dbContext.CoberturasMedicas
            .AsNoTracking()
            .OrderBy(c => c.Nombre)
            .Select(c => new CoberturaMedicaResponse(c.Id, c.Nombre, c.Descripcion, c.Estado.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(coberturas);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "coberturas-medicas.leer")]
    public async Task<ActionResult<CoberturaMedicaResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var cobertura = await _dbContext.CoberturasMedicas.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (cobertura is null)
        {
            return NotFound();
        }

        return Ok(new CoberturaMedicaResponse(cobertura.Id, cobertura.Nombre, cobertura.Descripcion, cobertura.Estado.ToString()));
    }

    [HttpPost]
    [Authorize(Policy = "coberturas-medicas.crear")]
    public async Task<ActionResult<CoberturaMedicaResponse>> Crear([FromBody] CoberturaMedicaRequest request, CancellationToken cancellationToken)
    {
        var cobertura = new CoberturaMedica
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            Estado = EstadoCoberturaMedica.Activo
        };

        _dbContext.CoberturasMedicas.Add(cobertura);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new CoberturaMedicaResponse(cobertura.Id, cobertura.Nombre, cobertura.Descripcion, cobertura.Estado.ToString());
        return CreatedAtAction(nameof(Obtener), new { id = cobertura.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "coberturas-medicas.editar")]
    public async Task<ActionResult<CoberturaMedicaResponse>> Actualizar(Guid id, [FromBody] CoberturaMedicaRequest request, CancellationToken cancellationToken)
    {
        var cobertura = await _dbContext.CoberturasMedicas.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (cobertura is null)
        {
            return NotFound();
        }

        cobertura.Nombre = request.Nombre;
        cobertura.Descripcion = request.Descripcion;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new CoberturaMedicaResponse(cobertura.Id, cobertura.Nombre, cobertura.Descripcion, cobertura.Estado.ToString()));
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "coberturas-medicas.baja")]
    public async Task<IActionResult> Baja(Guid id, CancellationToken cancellationToken)
    {
        var cobertura = await _dbContext.CoberturasMedicas.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (cobertura is null)
        {
            return NotFound();
        }

        cobertura.Estado = EstadoCoberturaMedica.Inactivo;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // ---- Planes (SPEC.md §4.2 "Plan", NUEVO-SPEC-UI) ----

    [HttpGet("{coberturaId:guid}/planes")]
    [Authorize(Policy = "coberturas-medicas.leer")]
    public async Task<ActionResult<IReadOnlyList<PlanResponse>>> ListarPlanes(Guid coberturaId, CancellationToken cancellationToken)
    {
        var existeCobertura = await _dbContext.CoberturasMedicas.AnyAsync(c => c.Id == coberturaId, cancellationToken);
        if (!existeCobertura)
        {
            return NotFound();
        }

        var planes = await _dbContext.Planes
            .AsNoTracking()
            .Where(p => p.CoberturaMedicaId == coberturaId)
            .OrderBy(p => p.Nombre)
            .Select(p => new PlanResponse(p.Id, p.CoberturaMedicaId, p.Nombre, p.Estado.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(planes);
    }

    [HttpPost("{coberturaId:guid}/planes")]
    [Authorize(Policy = "coberturas-medicas.crear")]
    public async Task<ActionResult<PlanResponse>> CrearPlan(Guid coberturaId, [FromBody] PlanRequest request, CancellationToken cancellationToken)
    {
        var existeCobertura = await _dbContext.CoberturasMedicas.AnyAsync(c => c.Id == coberturaId, cancellationToken);
        if (!existeCobertura)
        {
            return NotFound(new { message = "La cobertura médica indicada no existe." });
        }

        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            CoberturaMedicaId = coberturaId,
            Nombre = request.Nombre,
            Estado = EstadoPlan.Activo
        };

        _dbContext.Planes.Add(plan);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new PlanResponse(plan.Id, plan.CoberturaMedicaId, plan.Nombre, plan.Estado.ToString());
        return CreatedAtAction(nameof(ListarPlanes), new { coberturaId }, response);
    }

    [HttpPut("{coberturaId:guid}/planes/{planId:guid}")]
    [Authorize(Policy = "coberturas-medicas.editar")]
    public async Task<ActionResult<PlanResponse>> ActualizarPlan(Guid coberturaId, Guid planId, [FromBody] PlanRequest request, CancellationToken cancellationToken)
    {
        var plan = await _dbContext.Planes.FirstOrDefaultAsync(p => p.Id == planId && p.CoberturaMedicaId == coberturaId, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        plan.Nombre = request.Nombre;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new PlanResponse(plan.Id, plan.CoberturaMedicaId, plan.Nombre, plan.Estado.ToString()));
    }

    [HttpPost("{coberturaId:guid}/planes/{planId:guid}/baja")]
    [Authorize(Policy = "coberturas-medicas.baja")]
    public async Task<IActionResult> BajaPlan(Guid coberturaId, Guid planId, CancellationToken cancellationToken)
    {
        var plan = await _dbContext.Planes.FirstOrDefaultAsync(p => p.Id == planId && p.CoberturaMedicaId == coberturaId, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        plan.Estado = EstadoPlan.Inactivo;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
