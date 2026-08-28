namespace ProyectoUnion.Application.Dtos.Reportes;

/// <summary>
/// Fila de GET /api/reportes/espacios?desde=&amp;hasta= (Etapa 7): una por cada Espacio,
/// contando Reserva en estado Confirmada o Pagada cuya Fecha cae en el rango [desde, hasta]
/// (default: mes en curso, mismo criterio que el "mes actual" de
/// <c>FinanzasController.Dashboard</c>). <see cref="ImporteTotal"/> suma
/// Reserva.Importe, tratando null como 0.
/// </summary>
public sealed record ReporteEspacioItemResponse(
    Guid EspacioId,
    string Nombre,
    int CantidadReservas,
    decimal ImporteTotal);
