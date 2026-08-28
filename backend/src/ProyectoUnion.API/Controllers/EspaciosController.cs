using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Espacios;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Espacios (SPEC.md §5 "Espacios y Reservas", §4.2 "Espacio"). Expone también la
/// disponibilidad horaria de un día (<see cref="Disponibilidad"/>), usada por el frontend
/// para pintar los horarios ya ocupados antes de armar una Reserva.
/// </summary>
[ApiController]
[Route("api/espacios")]
[Authorize]
public class EspaciosController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public EspaciosController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "espacios.leer")]
    public async Task<ActionResult<PagedResult<EspacioResponse>>> Listar(
        [FromQuery] string? nombre,
        [FromQuery] int? tipo,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = EspaciosConIncludes();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var texto = nombre.Trim();
            query = query.Where(e => e.Nombre.Contains(texto));
        }

        if (tipo.HasValue)
        {
            var tipoFiltro = (TipoEspacio)tipo.Value;
            query = query.Where(e => e.Tipo == tipoFiltro);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoEspacio)estado.Value;
            query = query.Where(e => e.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var espacios = await query
            .OrderBy(e => e.Nombre)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<EspacioResponse>(espacios.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "espacios.leer")]
    public async Task<ActionResult<EspacioResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var espacio = await EspaciosConIncludes().FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (espacio is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(espacio));
    }

    [HttpPost]
    [Authorize(Policy = "espacios.crear")]
    public async Task<ActionResult<EspacioResponse>> Crear([FromBody] CrearEspacioRequest request, CancellationToken cancellationToken)
    {
        var amenityIds = request.AmenityIds?.Distinct().ToList() ?? new List<Guid>();
        if (amenityIds.Count > 0)
        {
            var existentes = await _dbContext.Amenities.CountAsync(a => amenityIds.Contains(a.Id), cancellationToken);
            if (existentes != amenityIds.Count)
            {
                return BadRequest(new { message = "Uno o más amenities indicados no existen." });
            }
        }

        var espacio = new Espacio
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            Ubicacion = request.Ubicacion,
            Tipo = (TipoEspacio)request.Tipo,
            Capacidad = request.Capacidad,
            Precio = request.Precio,
            UnidadPrecio = (UnidadPrecioEspacio)request.UnidadPrecio,
            SolicitarEvaluacion = request.SolicitarEvaluacion,
            PermitirNoSocios = request.PermitirNoSocios,
            Estado = EstadoEspacio.Activo,
            ImagenUrl = request.ImagenUrl,
            PoliticaCancelacionHoras = request.PoliticaCancelacionHoras,
            PorcentajeReembolso = request.PorcentajeReembolso
        };

        foreach (var amenityId in amenityIds)
        {
            espacio.EspacioAmenities.Add(new EspacioAmenity { EspacioId = espacio.Id, AmenityId = amenityId });
        }

        _dbContext.Espacios.Add(espacio);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var espacioCreado = await EspaciosConIncludes().FirstAsync(e => e.Id == espacio.Id, cancellationToken);
        return CreatedAtAction(nameof(Obtener), new { id = espacio.Id }, MapearAResponse(espacioCreado));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "espacios.editar")]
    public async Task<ActionResult<EspacioResponse>> Actualizar(Guid id, [FromBody] ActualizarEspacioRequest request, CancellationToken cancellationToken)
    {
        var espacio = await _dbContext.Espacios
            .Include(e => e.EspacioAmenities)
            .FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (espacio is null)
        {
            return NotFound();
        }

        var amenityIds = request.AmenityIds?.Distinct().ToList() ?? new List<Guid>();
        if (amenityIds.Count > 0)
        {
            var existentes = await _dbContext.Amenities.CountAsync(a => amenityIds.Contains(a.Id), cancellationToken);
            if (existentes != amenityIds.Count)
            {
                return BadRequest(new { message = "Uno o más amenities indicados no existen." });
            }
        }

        espacio.Nombre = request.Nombre;
        espacio.Descripcion = request.Descripcion;
        espacio.Ubicacion = request.Ubicacion;
        espacio.Tipo = (TipoEspacio)request.Tipo;
        espacio.Capacidad = request.Capacidad;
        espacio.Precio = request.Precio;
        espacio.UnidadPrecio = (UnidadPrecioEspacio)request.UnidadPrecio;
        espacio.SolicitarEvaluacion = request.SolicitarEvaluacion;
        espacio.PermitirNoSocios = request.PermitirNoSocios;
        espacio.Estado = (EstadoEspacio)request.Estado;
        espacio.ImagenUrl = request.ImagenUrl;
        espacio.PoliticaCancelacionHoras = request.PoliticaCancelacionHoras;
        espacio.PorcentajeReembolso = request.PorcentajeReembolso;

        _dbContext.EspacioAmenities.RemoveRange(espacio.EspacioAmenities);
        foreach (var amenityId in amenityIds)
        {
            _dbContext.EspacioAmenities.Add(new EspacioAmenity { EspacioId = espacio.Id, AmenityId = amenityId });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var espacioActualizado = await EspaciosConIncludes().FirstAsync(e => e.Id == id, cancellationToken);
        return Ok(MapearAResponse(espacioActualizado));
    }

    [HttpGet("{id:guid}/disponibilidad")]
    [Authorize(Policy = "espacios.leer")]
    public async Task<ActionResult<DisponibilidadEspacioResponse>> Disponibilidad(Guid id, [FromQuery] DateTime fecha, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Espacios.AnyAsync(e => e.Id == id, cancellationToken))
        {
            return NotFound();
        }

        var fechaUtc = DateTime.SpecifyKind(fecha.Date, DateTimeKind.Utc);

        var ocupados = await _dbContext.Reservas
            .AsNoTracking()
            .Where(r => r.EspacioId == id
                && r.Fecha == fechaUtc
                && (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.PendienteConfirmacion || r.Estado == EstadoReserva.Pagada))
            .OrderBy(r => r.HoraInicio)
            .Select(r => new BloqueOcupadoResponse(r.Id, r.HoraInicio, r.HoraFin, r.Estado.ToString()))
            .ToListAsync(cancellationToken);

        return Ok(new DisponibilidadEspacioResponse(id, fechaUtc, ocupados));
    }

    private IQueryable<Espacio> EspaciosConIncludes() =>
        _dbContext.Espacios
            .AsNoTracking()
            .Include(e => e.EspacioAmenities).ThenInclude(ea => ea.Amenity);

    private static EspacioResponse MapearAResponse(Espacio e) => new(
        e.Id,
        e.Nombre,
        e.Descripcion,
        e.Ubicacion,
        e.Tipo.ToString(),
        e.Capacidad,
        e.Precio,
        e.UnidadPrecio.ToString(),
        e.SolicitarEvaluacion,
        e.PermitirNoSocios,
        e.Estado.ToString(),
        e.ImagenUrl,
        e.PoliticaCancelacionHoras,
        e.PorcentajeReembolso,
        e.EspacioAmenities.Select(ea => new AmenityResponse(ea.AmenityId, ea.Amenity.Nombre)).ToList());
}
