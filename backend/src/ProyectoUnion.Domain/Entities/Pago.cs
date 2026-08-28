namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Medio de pago de un <see cref="Pago"/> (SPEC.md §7.2 "PaymentMethodSelector" — Mercado
/// Pago / Transferencia; se agrega Efectivo para el registro manual presencial de Empleado).
/// </summary>
public enum MedioPago
{
    Efectivo = 1,
    Transferencia = 2,
    MercadoPago = 3
}

/// <summary>
/// Estado de un <see cref="Pago"/>. <see cref="PendienteReembolso"/> agregado en Etapa 3
/// (RN-RES-01, SPEC.md §3.9): reembolso pendiente de gestión manual de Finanzas — Mercado
/// Pago requiere una operación de devolución explícita vía su propia API, fuera de alcance.
/// </summary>
public enum EstadoPago
{
    Pendiente = 1,
    Pagada = 2,
    Rechazada = 3,
    PendienteReembolso = 4
}

/// <summary>
/// Pago registrado contra una Cuota, una Reserva o un ConceptoIngresoLibre (SPEC.md §4.2
/// "Pago") — exactamente uno de los tres no nulo (RF-FIN-34, actualizado por RN-FIN-09,
/// §3.20), validado en <c>PagosController</c>/<c>IPagoService</c> (no CHECK de base de
/// datos). El pago de varias cuotas en una operación genera múltiples filas de Pago
/// (RN-FIN-07, §3.16), compartiendo <see cref="MercadoPagoTransaccionId"/> cuando el medio es
/// Mercado Pago.
/// </summary>
public class Pago : Common.IAuditable
{
    public Guid Id { get; set; }

    /// <summary>Null si el origen es ConceptoIngresoLibre sin socio identificado.</summary>
    public Guid? SocioId { get; set; }

    public Socio? Socio { get; set; }

    public Guid? CuotaId { get; set; }

    public Cuota? Cuota { get; set; }

    public Guid? ReservaId { get; set; }

    public Reserva? Reserva { get; set; }

    public Guid? ConceptoIngresoLibreId { get; set; }

    public ConceptoIngresoLibre? ConceptoIngresoLibre { get; set; }

    public string Concepto { get; set; } = string.Empty;

    public DateTime Fecha { get; set; } = DateTime.UtcNow;

    public decimal Importe { get; set; }

    public MedioPago MedioPago { get; set; }

    public EstadoPago Estado { get; set; } = EstadoPago.Pendiente;

    public string? MercadoPagoTransaccionId { get; set; }

    public string? ComprobanteUrl { get; set; }
}
