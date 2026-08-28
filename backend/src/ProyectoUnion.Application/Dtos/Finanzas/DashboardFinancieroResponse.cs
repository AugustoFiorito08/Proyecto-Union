namespace ProyectoUnion.Application.Dtos.Finanzas;

/// <summary>
/// KPIs de GET /api/finanzas/dashboard (SPEC.md §5, enunciado Etapa 3). SociosMorosos es
/// derivado (RN-FIN-01, §3.2: consulta filtrada por Cuota.Estado=Vencida, no un campo
/// persistido en Socio).
/// </summary>
public sealed record DashboardFinancieroResponse(
    decimal IngresosMesActual,
    int SociosMorosos,
    int CuotasPendientes,
    int CuotasVencidas,
    int ReservasPagadasPendientesDeCheck);
