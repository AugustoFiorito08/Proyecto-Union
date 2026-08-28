namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Reembolso de reservas canceladas (RN-RES-01, SPEC.md §3.9). Compartido entre
/// <c>ReservasController.Cancelar</c> (staff) y <c>MePortalController.CancelarReserva</c>
/// (Socio) — antes de esta implementación, el path del Socio no calculaba
/// DentroDePoliticaCancelacion ni generaba el reembolso (bug real de Etapa 2).
/// </summary>
public interface IReembolsoReservaService
{
    /// <summary>
    /// Marca la Reserva como Cancelada y, si estaba Pagada y la cancelación ocurre dentro de
    /// la política del Espacio (<c>PoliticaCancelacionHoras</c>), genera un Pago de reembolso
    /// pendiente (Estado=PendienteReembolso, Importe = Reserva.Importe *
    /// Espacio.PorcentajeReembolso / 100, mismo MedioPago que el pago original). Devuelve si
    /// la cancelación ocurrió dentro de la política (para el response del controller).
    /// </summary>
    Task<bool> CancelarYReembolsarSiCorrespondeAsync(Guid reservaId, CancellationToken cancellationToken);
}
