namespace ProyectoUnion.Application.Dtos.Pagos;

public sealed record PagoResponse(
    Guid Id,
    Guid? SocioId,
    string? SocioApellidoNombres,
    Guid? CuotaId,
    string? CuotaPeriodo,
    Guid? ReservaId,
    string? ReservaEspacioNombre,
    Guid? ConceptoIngresoLibreId,
    string? ConceptoIngresoLibreNombre,
    string Concepto,
    DateTime Fecha,
    decimal Importe,
    string MedioPago,
    string Estado,
    string? MercadoPagoTransaccionId,
    string? ComprobanteUrl);
