namespace ProyectoUnion.Application.Dtos.Pagos;

/// <summary>
/// Body de POST /api/pagos y POST /api/pagos/mercadopago/checkout (SPEC.md §5, enunciado
/// Etapa 3). Admite exactamente uno de los tres grupos: <see cref="CuotaIds"/> (RN-FIN-07,
/// §3.16 — "pagar todo" genera N filas de Pago), <see cref="ReservaId"/> o
/// <see cref="ConceptoIngresoLibreId"/> (junto con <see cref="SocioId"/>/<see cref="Concepto"/>
/// /<see cref="Importe"/>, RN-FIN-09, §3.20). <see cref="MedioPago"/>/
/// <see cref="MercadoPagoTransaccionId"/> no se usan en el checkout (se completan recién al
/// confirmarse el pago vía webhook).
/// </summary>
public sealed record CrearPagoRequest(
    Guid[]? CuotaIds,
    Guid? ReservaId,
    Guid? ConceptoIngresoLibreId,
    Guid? SocioId,
    string? Concepto,
    decimal? Importe,
    int MedioPago,
    string? MercadoPagoTransaccionId);
