using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Espacios;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM simple del catálogo de Amenities (SPEC.md §5 "CRUD /api/configuracion/amenities",
/// §4.2 "Amenity"). Sin Estado (no está en el modelo): la baja es física.
/// </summary>
[ApiController]
[Route("api/configuracion/amenities")]
[Authorize]
public class AmenitiesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public AmenitiesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "amenities.leer")]
    public async Task<ActionResult<IReadOnlyList<AmenityResponse>>> Listar(CancellationToken cancellationToken)
    {
        var amenities = await _dbContext.Amenities
            .AsNoTracking()
            .OrderBy(a => a.Nombre)
            .Select(a => new AmenityResponse(a.Id, a.Nombre))
            .ToListAsync(cancellationToken);

        return Ok(amenities);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "amenities.leer")]
    public async Task<ActionResult<AmenityResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var amenity = await _dbContext.Amenities.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (amenity is null)
        {
            return NotFound();
        }

        return Ok(new AmenityResponse(amenity.Id, amenity.Nombre));
    }

    [HttpPost]
    [Authorize(Policy = "amenities.crear")]
    public async Task<ActionResult<AmenityResponse>> Crear([FromBody] AmenityRequest request, CancellationToken cancellationToken)
    {
        if (await _dbContext.Amenities.AnyAsync(a => a.Nombre == request.Nombre, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe un amenity con ese nombre." });
        }

        var amenity = new Amenity { Id = Guid.NewGuid(), Nombre = request.Nombre };
        _dbContext.Amenities.Add(amenity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new AmenityResponse(amenity.Id, amenity.Nombre);
        return CreatedAtAction(nameof(Obtener), new { id = amenity.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "amenities.editar")]
    public async Task<ActionResult<AmenityResponse>> Actualizar(Guid id, [FromBody] AmenityRequest request, CancellationToken cancellationToken)
    {
        var amenity = await _dbContext.Amenities.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (amenity is null)
        {
            return NotFound();
        }

        if (await _dbContext.Amenities.AnyAsync(a => a.Nombre == request.Nombre && a.Id != id, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe otro amenity con ese nombre." });
        }

        amenity.Nombre = request.Nombre;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new AmenityResponse(amenity.Id, amenity.Nombre));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "amenities.baja")]
    public async Task<IActionResult> Eliminar(Guid id, CancellationToken cancellationToken)
    {
        var amenity = await _dbContext.Amenities.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (amenity is null)
        {
            return NotFound();
        }

        _dbContext.Amenities.Remove(amenity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
