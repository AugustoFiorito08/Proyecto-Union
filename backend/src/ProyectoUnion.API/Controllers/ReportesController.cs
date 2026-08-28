using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Reportes;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Reportes operativos por módulo (Etapa 7, matriz §2.2 fila "Reportes generales": SuperAdmin
/// CLMB, Administrador CL, resto sin acceso — a diferencia de la fila "Finanzas —
/// Reportes/Dashboard" de <see cref="FinanzasController"/>, que también excluye a Empleado
/// pero es un módulo aparte). Solo lectura: 3 endpoints de agregación (GROUP BY/COUNT) sobre
/// datos ya existentes, sin entidades nuevas ni reglas de negocio nuevas.
/// </summary>
[ApiController]
[Route("api/reportes")]
[Authorize(Policy = "reportes.leer")]
public class ReportesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ReportesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("socios")]
    public async Task<ActionResult<ReporteSociosResponse>> Socios(CancellationToken cancellationToken)
    {
        var conteosPorEstado = await _dbContext.Socios
            .AsNoTracking()
            .GroupBy(s => s.Estado)
            .Select(g => new { Estado = g.Key, Cantidad = g.Count() })
            .ToListAsync(cancellationToken);

        // Se listan siempre los 3 estados de EstadoSocio, con Cantidad=0 para el que no
        // tenga socios (en lugar de omitir la fila).
        var porEstado = Enum.GetValues<EstadoSocio>()
            .Select(estado => new SocioPorEstadoItemResponse(
                estado.ToString(),
                conteosPorEstado.FirstOrDefault(c => c.Estado == estado)?.Cantidad ?? 0))
            .ToList();

        var porCategoria = await _dbContext.Socios
            .AsNoTracking()
            .Where(s => s.Estado == EstadoSocio.Activo)
            .GroupBy(s => new { s.CategoriaId, s.Categoria.Nombre })
            .Select(g => new SocioPorCategoriaItemResponse(g.Key.CategoriaId, g.Key.Nombre, g.Count()))
            .ToListAsync(cancellationToken);

        // RN-FIN-01 (SPEC.md §3.2): misma query que FinanzasController.Dashboard —
        // "moroso" es derivado, socios distintos con al menos una Cuota en estado Vencida.
        var sociosMorosos = await _dbContext.Cuotas
            .Where(c => c.Estado == EstadoCuota.Vencida && c.SocioId != null)
            .Select(c => c.SocioId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        return Ok(new ReporteSociosResponse(porEstado, porCategoria, sociosMorosos));
    }

    [HttpGet("actividades")]
    public async Task<ActionResult<IReadOnlyList<ReporteActividadItemResponse>>> Actividades(CancellationToken cancellationToken)
    {
        var actividades = await _dbContext.Actividades
            .AsNoTracking()
            .Where(a => a.Estado == EstadoActividad.Activa)
            .Select(a => new
            {
                a.Id,
                a.Nombre,
                a.CupoMaximo,
                InscriptosActivos = a.Inscripciones.Count(i => i.Estado == EstadoInscripcion.Activa)
            })
            .ToListAsync(cancellationToken);

        var items = actividades
            .Select(a => new ReporteActividadItemResponse(
                a.Id,
                a.Nombre,
                a.CupoMaximo,
                a.InscriptosActivos,
                a.CupoMaximo == 0
                    ? 0
                    : (int)Math.Round(a.InscriptosActivos * 100m / a.CupoMaximo, MidpointRounding.AwayFromZero)))
            .ToList();

        return Ok(items);
    }

    [HttpGet("espacios")]
    public async Task<ActionResult<IReadOnlyList<ReporteEspacioItemResponse>>> Espacios(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken cancellationToken)
    {
        var ahora = DateTime.UtcNow;
        var inicioMesActual = DateTime.SpecifyKind(new DateTime(ahora.Year, ahora.Month, 1), DateTimeKind.Utc);
        var inicioMesSiguiente = inicioMesActual.AddMonths(1);

        // Sin query params: default al mes en curso (mismo criterio que "mes actual" de
        // FinanzasController.Dashboard). Con query params: mismo patrón de
        // FinanzasController.ReporteIngresos (SpecifyKind Utc, hasta exclusivo +1 día).
        var desdeUtc = desde.HasValue
            ? DateTime.SpecifyKind(desde.Value.Date, DateTimeKind.Utc)
            : inicioMesActual;
        var hastaExclusivoUtc = hasta.HasValue
            ? DateTime.SpecifyKind(hasta.Value.Date.AddDays(1), DateTimeKind.Utc)
            : inicioMesSiguiente;

        var reservas = await _dbContext.Reservas
            .AsNoTracking()
            .Where(r => (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.Pagada)
                && r.Fecha >= desdeUtc && r.Fecha < hastaExclusivoUtc)
            .Select(r => new { r.EspacioId, r.Importe })
            .ToListAsync(cancellationToken);

        var estadisticasPorEspacio = reservas
            .GroupBy(r => r.EspacioId)
            .ToDictionary(g => g.Key, g => (Cantidad: g.Count(), Importe: g.Sum(r => r.Importe ?? 0m)));

        var espacios = await _dbContext.Espacios
            .AsNoTracking()
            .Select(e => new { e.Id, e.Nombre })
            .ToListAsync(cancellationToken);

        var items = espacios
            .Select(e =>
            {
                var estadisticas = estadisticasPorEspacio.TryGetValue(e.Id, out var valor)
                    ? valor
                    : (Cantidad: 0, Importe: 0m);
                return new ReporteEspacioItemResponse(e.Id, e.Nombre, estadisticas.Cantidad, estadisticas.Importe);
            })
            .ToList();

        return Ok(items);
    }
}
