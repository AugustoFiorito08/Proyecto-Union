using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Categorias;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Categorías de socio (SPEC.md §5 "CRUD /api/configuracion/categorias", §4.2
/// "Categoria"). La baja es lógica (Estado=Inactivo): una Categoria ya asignada a Socios no
/// se elimina físicamente.
/// </summary>
[ApiController]
[Route("api/configuracion/categorias")]
[Authorize]
public class CategoriasController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public CategoriasController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "categorias.leer")]
    public async Task<ActionResult<IReadOnlyList<CategoriaResponse>>> Listar(CancellationToken cancellationToken)
    {
        var categorias = await _dbContext.Categorias
            .AsNoTracking()
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaResponse(c.Id, c.Nombre, c.Descripcion, c.ValorCuota, c.Estado.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(categorias);
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "categorias.leer")]
    public async Task<ActionResult<CategoriaResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var categoria = await _dbContext.Categorias.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (categoria is null)
        {
            return NotFound();
        }

        return Ok(new CategoriaResponse(categoria.Id, categoria.Nombre, categoria.Descripcion, categoria.ValorCuota, categoria.Estado.ToString()));
    }

    [HttpPost]
    [Authorize(Policy = "categorias.crear")]
    public async Task<ActionResult<CategoriaResponse>> Crear([FromBody] CategoriaRequest request, CancellationToken cancellationToken)
    {
        var categoria = new Categoria
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            ValorCuota = request.ValorCuota,
            Estado = EstadoCategoria.Activo
        };

        _dbContext.Categorias.Add(categoria);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new CategoriaResponse(categoria.Id, categoria.Nombre, categoria.Descripcion, categoria.ValorCuota, categoria.Estado.ToString());
        return CreatedAtAction(nameof(Obtener), new { id = categoria.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "categorias.editar")]
    public async Task<ActionResult<CategoriaResponse>> Actualizar(Guid id, [FromBody] CategoriaRequest request, CancellationToken cancellationToken)
    {
        var categoria = await _dbContext.Categorias.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (categoria is null)
        {
            return NotFound();
        }

        categoria.Nombre = request.Nombre;
        categoria.Descripcion = request.Descripcion;
        categoria.ValorCuota = request.ValorCuota;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new CategoriaResponse(categoria.Id, categoria.Nombre, categoria.Descripcion, categoria.ValorCuota, categoria.Estado.ToString()));
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "categorias.baja")]
    public async Task<IActionResult> Baja(Guid id, CancellationToken cancellationToken)
    {
        var categoria = await _dbContext.Categorias.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (categoria is null)
        {
            return NotFound();
        }

        categoria.Estado = EstadoCategoria.Inactivo;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
