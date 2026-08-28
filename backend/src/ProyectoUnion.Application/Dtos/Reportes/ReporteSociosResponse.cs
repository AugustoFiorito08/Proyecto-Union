namespace ProyectoUnion.Application.Dtos.Reportes;

/// <summary>
/// Respuesta de GET /api/reportes/socios (Etapa 7, matriz §2.2 fila "Reportes generales":
/// SuperAdmin/Administrador L, resto sin acceso). <see cref="SociosMorosos"/> reusa
/// exactamente la misma query que <c>FinanzasController.Dashboard</c> (RN-FIN-01, §3.2:
/// socios distintos con al menos una Cuota en estado Vencida).
/// </summary>
public sealed record ReporteSociosResponse(
    IReadOnlyList<SocioPorEstadoItemResponse> PorEstado,
    IReadOnlyList<SocioPorCategoriaItemResponse> PorCategoria,
    int SociosMorosos);
