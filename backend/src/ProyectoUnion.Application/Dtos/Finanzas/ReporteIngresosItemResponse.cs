namespace ProyectoUnion.Application.Dtos.Finanzas;

/// <summary>
/// Fila de GET /api/finanzas/reportes/ingresos, agrupada por origen del Pago ("Cuota" /
/// "Reserva" / "ConceptoIngresoLibre" — RN-FIN-09, SPEC.md §3.20). <see cref="ConceptoNombre"/>
/// solo se completa cuando Origen="ConceptoIngresoLibre".
/// </summary>
public sealed record ReporteIngresosItemResponse(
    string Origen,
    string? ConceptoNombre,
    int Cantidad,
    decimal Total);
