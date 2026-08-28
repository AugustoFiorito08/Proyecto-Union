using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Finanzas;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Dashboard y reportes financieros (SPEC.md §5 "GET /api/finanzas/dashboard", "GET
/// /api/finanzas/reportes/ingresos", matriz §2.2 fila "Finanzas — Reportes/Dashboard": solo
/// L, exclusivo SuperAdmin/Administrador).
/// </summary>
[ApiController]
[Route("api/finanzas")]
[Authorize(Policy = "finanzas.reportes.leer")]
public class FinanzasController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public FinanzasController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardFinancieroResponse>> Dashboard(CancellationToken cancellationToken)
    {
        var ahora = DateTime.UtcNow;
        var inicioMes = DateTime.SpecifyKind(new DateTime(ahora.Year, ahora.Month, 1), DateTimeKind.Utc);
        var inicioMesSiguiente = inicioMes.AddMonths(1);

        var ingresosMesActual = await _dbContext.Pagos
            .Where(p => p.Estado == EstadoPago.Pagada && p.Fecha >= inicioMes && p.Fecha < inicioMesSiguiente)
            .SumAsync(p => (decimal?)p.Importe, cancellationToken) ?? 0m;

        // RN-FIN-01 (SPEC.md §3.2): "moroso" es derivado — consulta filtrada, no un campo
        // persistido en Socio.
        var sociosMorosos = await _dbContext.Cuotas
            .Where(c => c.Estado == EstadoCuota.Vencida && c.SocioId != null)
            .Select(c => c.SocioId!.Value)
            .Distinct()
            .CountAsync(cancellationToken);

        var cuotasPendientes = await _dbContext.Cuotas.CountAsync(c => c.Estado == EstadoCuota.Pendiente, cancellationToken);
        var cuotasVencidas = await _dbContext.Cuotas.CountAsync(c => c.Estado == EstadoCuota.Vencida, cancellationToken);
        var reservasPagadasPendientesDeCheck = await _dbContext.Reservas.CountAsync(r => r.Estado == EstadoReserva.Pagada, cancellationToken);

        return Ok(new DashboardFinancieroResponse(
            ingresosMesActual, sociosMorosos, cuotasPendientes, cuotasVencidas, reservasPagadasPendientesDeCheck));
    }

    [HttpGet("reportes/ingresos")]
    public async Task<ActionResult<IReadOnlyList<ReporteIngresosItemResponse>>> ReporteIngresos(
        [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, CancellationToken cancellationToken)
    {
        var query = _dbContext.Pagos
            .AsNoTracking()
            .Include(p => p.ConceptoIngresoLibre)
            .Where(p => p.Estado == EstadoPago.Pagada)
            .AsQueryable();

        if (desde.HasValue)
        {
            query = query.Where(p => p.Fecha >= DateTime.SpecifyKind(desde.Value.Date, DateTimeKind.Utc));
        }

        if (hasta.HasValue)
        {
            var hastaExclusivo = DateTime.SpecifyKind(hasta.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(p => p.Fecha < hastaExclusivo);
        }

        var pagos = await query.ToListAsync(cancellationToken);

        var items = pagos
            .GroupBy(p => new
            {
                Origen = p.CuotaId.HasValue ? "Cuota" : p.ReservaId.HasValue ? "Reserva" : "ConceptoIngresoLibre",
                ConceptoNombre = p.ConceptoIngresoLibreId.HasValue ? p.ConceptoIngresoLibre?.Nombre : null
            })
            .Select(g => new ReporteIngresosItemResponse(g.Key.Origen, g.Key.ConceptoNombre, g.Count(), g.Sum(p => p.Importe)))
            .OrderByDescending(i => i.Total)
            .ToList();

        return Ok(items);
    }
}
