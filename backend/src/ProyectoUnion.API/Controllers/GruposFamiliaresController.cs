using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.GruposFamiliares;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Grupos Familiares (SPEC.md §5 "Grupos Familiares", §4.2 "GrupoFamiliar"). La regla
/// de titularidad (RF-GF-04 bis, RN-GF-01, §3.4) se aplica en <see cref="Baja"/> de
/// <c>SociosController</c> (impide la baja del titular) y en <see cref="CambiarTitular"/> acá
/// (reasignación transaccional).
/// </summary>
[ApiController]
[Route("api/grupos-familiares")]
[Authorize]
public class GruposFamiliaresController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public GruposFamiliaresController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "grupos-familiares.leer")]
    public async Task<ActionResult<PagedResult<GrupoFamiliarResponse>>> Listar(
        [FromQuery] string? nombre,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = _dbContext.GruposFamiliares
            .AsNoTracking()
            .Include(g => g.TitularSocio)
            .Include(g => g.Integrantes)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var texto = nombre.Trim();
            query = query.Where(g => g.Nombre.Contains(texto) || g.NumeroGrupo.Contains(texto));
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoGrupoFamiliar)estado.Value;
            query = query.Where(g => g.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var grupos = await query
            .OrderBy(g => g.Nombre)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = grupos.Select(MapearAResponse).ToList();

        return Ok(new PagedResult<GrupoFamiliarResponse>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "grupos-familiares.leer")]
    public async Task<ActionResult<GrupoFamiliarResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var grupo = await ObtenerGrupoConIncludes(id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(grupo));
    }

    [HttpPost]
    [Authorize(Policy = "grupos-familiares.crear")]
    public async Task<ActionResult<GrupoFamiliarResponse>> Crear([FromBody] CrearGrupoFamiliarRequest request, CancellationToken cancellationToken)
    {
        var titular = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == request.TitularSocioId, cancellationToken);
        if (titular is null)
        {
            return BadRequest(new { message = "El socio titular indicado no existe." });
        }

        if (titular.GrupoFamiliarId.HasValue)
        {
            return BadRequest(new { message = "El socio ya integra otro grupo familiar." });
        }

        var grupo = new GrupoFamiliar
        {
            Id = Guid.NewGuid(),
            NumeroGrupo = await GenerarNumeroGrupoAsync(cancellationToken),
            Nombre = request.Nombre,
            Tipo = TipoGrupoFamiliar.Matrimonio,
            TitularSocioId = titular.Id,
            Estado = EstadoGrupoFamiliar.Activo,
            Observaciones = request.Observaciones,
            FechaCreacion = DateTime.UtcNow
        };

        _dbContext.GruposFamiliares.Add(grupo);

        titular.GrupoFamiliarId = grupo.Id;
        titular.Parentesco = Parentesco.Titular;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var grupoCreado = await ObtenerGrupoConIncludes(grupo.Id, cancellationToken);
        var response = MapearAResponse(grupoCreado!);
        return CreatedAtAction(nameof(Obtener), new { id = grupo.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "grupos-familiares.editar")]
    public async Task<ActionResult<GrupoFamiliarResponse>> Actualizar(Guid id, [FromBody] ActualizarGrupoFamiliarRequest request, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        grupo.Nombre = request.Nombre;
        grupo.Observaciones = request.Observaciones;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var grupoActualizado = await ObtenerGrupoConIncludes(id, cancellationToken);
        return Ok(MapearAResponse(grupoActualizado!));
    }

    [HttpPost("{id:guid}/integrantes")]
    [Authorize(Policy = "grupos-familiares.editar")]
    public async Task<ActionResult<GrupoFamiliarResponse>> AgregarIntegrante(Guid id, [FromBody] AgregarIntegranteRequest request, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        if (grupo.Estado != EstadoGrupoFamiliar.Activo)
        {
            return BadRequest(new { message = "No se pueden agregar integrantes a un grupo familiar dado de baja." });
        }

        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == request.SocioId, cancellationToken);
        if (socio is null)
        {
            return BadRequest(new { message = "El socio indicado no existe." });
        }

        if (socio.GrupoFamiliarId.HasValue)
        {
            return BadRequest(new { message = "El socio ya integra un grupo familiar." });
        }

        socio.GrupoFamiliarId = grupo.Id;
        socio.Parentesco = (Parentesco)request.Parentesco;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await RecalcularTipoAsync(grupo, cancellationToken);

        var grupoActualizado = await ObtenerGrupoConIncludes(id, cancellationToken);
        return Ok(MapearAResponse(grupoActualizado!));
    }

    [HttpDelete("{id:guid}/integrantes/{socioId:guid}")]
    [Authorize(Policy = "grupos-familiares.editar")]
    public async Task<IActionResult> QuitarIntegrante(Guid id, Guid socioId, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        if (grupo.TitularSocioId == socioId)
        {
            return Conflict(new
            {
                message = "No se puede quitar al titular del grupo. Reasigne la titularidad primero " +
                           "(POST /api/grupos-familiares/{id}/cambiar-titular)."
            });
        }

        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == socioId && s.GrupoFamiliarId == id, cancellationToken);
        if (socio is null)
        {
            return NotFound(new { message = "El socio indicado no integra este grupo familiar." });
        }

        socio.GrupoFamiliarId = null;
        socio.Parentesco = null;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await RecalcularTipoAsync(grupo, cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/cambiar-titular")]
    [Authorize(Policy = "grupos-familiares.editar")]
    public async Task<ActionResult<GrupoFamiliarResponse>> CambiarTitular(Guid id, [FromBody] CambiarTitularRequest request, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        var nuevoTitular = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == request.NuevoTitularSocioId && s.GrupoFamiliarId == id, cancellationToken);
        if (nuevoTitular is null)
        {
            return BadRequest(new { message = "El nuevo titular debe ser un integrante actual del grupo familiar." });
        }

        if (nuevoTitular.Id == grupo.TitularSocioId)
        {
            return BadRequest(new { message = "El socio indicado ya es el titular del grupo." });
        }

        // RN-GF-01 (SPEC.md §3.4): reasignación transaccional de titularidad.
        await using var transaccion = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        var titularAnterior = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == grupo.TitularSocioId, cancellationToken);
        if (titularAnterior is not null)
        {
            // Decisión de implementación (no especificada en SPEC.md): el titular saliente
            // pasa a Cónyuge dentro del grupo; si el club necesita otro criterio (ej. mantener
            // "Hijo" para un caso particular), se ajusta manualmente vía PUT del integrante.
            titularAnterior.Parentesco = Parentesco.Conyuge;
        }

        nuevoTitular.Parentesco = Parentesco.Titular;
        grupo.TitularSocioId = nuevoTitular.Id;

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaccion.CommitAsync(cancellationToken);

        var grupoActualizado = await ObtenerGrupoConIncludes(id, cancellationToken);
        return Ok(MapearAResponse(grupoActualizado!));
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "grupos-familiares.baja")]
    public async Task<IActionResult> Baja(Guid id, [FromBody] BajaGrupoFamiliarRequest request, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        if (grupo.Estado == EstadoGrupoFamiliar.Baja)
        {
            return BadRequest(new { message = "El grupo familiar ya está dado de baja." });
        }

        grupo.Estado = EstadoGrupoFamiliar.Baja;
        grupo.FechaBaja = DateTime.UtcNow;
        grupo.MotivoBaja = request.Motivo;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/reactivar")]
    [Authorize(Policy = "grupos-familiares.editar")]
    public async Task<IActionResult> Reactivar(Guid id, CancellationToken cancellationToken)
    {
        var grupo = await _dbContext.GruposFamiliares.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
        if (grupo is null)
        {
            return NotFound();
        }

        if (grupo.Estado == EstadoGrupoFamiliar.Activo)
        {
            return BadRequest(new { message = "El grupo familiar ya se encuentra activo." });
        }

        grupo.Estado = EstadoGrupoFamiliar.Activo;
        grupo.FechaBaja = null;
        grupo.MotivoBaja = null;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private Task<GrupoFamiliar?> ObtenerGrupoConIncludes(Guid id, CancellationToken cancellationToken) =>
        _dbContext.GruposFamiliares
            .Include(g => g.TitularSocio)
            .Include(g => g.Integrantes)
            .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

    /// <summary>
    /// Tipo derivado de la cantidad de integrantes con Parentesco=Hijo (SPEC.md §4.2
    /// "GrupoFamiliar.Tipo"): 0 hijos = Matrimonio, 1/2/3+ hijos = GrupoFamiliar1/2/3.
    /// </summary>
    private async Task RecalcularTipoAsync(GrupoFamiliar grupo, CancellationToken cancellationToken)
    {
        var cantidadHijos = await _dbContext.Socios
            .CountAsync(s => s.GrupoFamiliarId == grupo.Id && s.Parentesco == Parentesco.Hijo, cancellationToken);

        grupo.Tipo = cantidadHijos switch
        {
            0 => TipoGrupoFamiliar.Matrimonio,
            1 => TipoGrupoFamiliar.GrupoFamiliar1,
            2 => TipoGrupoFamiliar.GrupoFamiliar2,
            _ => TipoGrupoFamiliar.GrupoFamiliar3
        };

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Decisión de implementación (no 100% especificada en SPEC.md): NumeroGrupo se genera
    /// como "G" + correlativo de 6 dígitos, con el mismo criterio (y misma limitación de
    /// concurrencia) que <c>SociosController.GenerarNumeroSocioAsync</c>.
    /// </summary>
    private async Task<string> GenerarNumeroGrupoAsync(CancellationToken cancellationToken)
    {
        var total = await _dbContext.GruposFamiliares.CountAsync(cancellationToken);
        return $"G{(total + 1):D6}";
    }

    private static GrupoFamiliarResponse MapearAResponse(GrupoFamiliar g) => new(
        g.Id,
        g.NumeroGrupo,
        g.Nombre,
        g.Tipo.ToString(),
        g.TitularSocioId,
        g.TitularSocio is not null ? $"{g.TitularSocio.Apellido}, {g.TitularSocio.Nombres}" : string.Empty,
        g.Estado.ToString(),
        g.Observaciones,
        g.MotivoBaja,
        g.FechaCreacion,
        g.FechaBaja,
        g.Integrantes
            .Select(i => new IntegranteGrupoFamiliarResponse(i.Id, $"{i.Apellido}, {i.Nombres}", i.Parentesco?.ToString()))
            .ToList());
}
