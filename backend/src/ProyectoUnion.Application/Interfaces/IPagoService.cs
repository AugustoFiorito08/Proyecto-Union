using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Lógica compartida de creación/confirmación de Pagos (RF-FIN-34, RN-FIN-05/06/07, SPEC.md
/// §3.8/§3.15/§3.16), usada tanto por <c>PagosController</c> (registro manual y checkout de
/// Mercado Pago) como por <c>MePortalController</c> (autogestión del Socio).
/// </summary>
public interface IPagoService
{
    /// <param name="request">Exactamente uno de CuotaIds/ReservaId/ConceptoIngresoLibreId.</param>
    /// <param name="socioActual">
    /// Null si quien llama es staff con permiso "pagos.crear". No null si quien llama es un
    /// Socio autenticado — aplica RN-FIN-06 (§3.15): solo puede pagar sus propias Cuotas, o
    /// las de un Grupo Familiar del que sea titular vigente; no puede usar el origen
    /// ConceptoIngresoLibre.
    /// </param>
    /// <param name="confirmarInmediatamente">
    /// True para el registro manual (POST /api/pagos): el/los Pago quedan Estado=Pagada de
    /// inmediato y cascadean a Cuota/Reserva. False para el checkout de Mercado Pago: el/los
    /// Pago quedan Estado=Pendiente hasta que el webhook confirme el pago real.
    /// </param>
    Task<ResultadoPago> CrearPagosAsync(
        CrearPagoRequest request,
        Socio? socioActual,
        bool confirmarInmediatamente,
        CancellationToken cancellationToken);

    /// <summary>
    /// Confirma un Pago Pendiente (webhook de Mercado Pago aprobado): lo marca Pagada y
    /// cascadea a su Cuota/Reserva asociada. Devuelve false si el Pago no existe.
    /// </summary>
    Task<bool> ConfirmarPagoAsync(Guid pagoId, string? mercadoPagoTransaccionId, CancellationToken cancellationToken);

    /// <summary>Marca un Pago Pendiente como Rechazada (webhook de Mercado Pago rechazado/cancelado). No cascadea.</summary>
    Task<bool> RechazarPagoAsync(Guid pagoId, CancellationToken cancellationToken);
}
