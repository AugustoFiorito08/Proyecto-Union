namespace ProyectoUnion.Application.Dtos.Reportes;

/// <summary>
/// Fila de "conteo de Socios por Estado" dentro de GET /api/reportes/socios (Etapa 7).
/// Incluye siempre los 3 estados de <c>EstadoSocio</c> (Activo/Suspendido/Inactivo, SPEC.md
/// §4.2), con Cantidad=0 para el estado que no tenga socios.
/// </summary>
public sealed record SocioPorEstadoItemResponse(
    string Estado,
    int Cantidad);
