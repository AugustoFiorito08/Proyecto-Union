using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Finanzas;

/// <summary>
/// Implementación de <see cref="IReembolsoReservaService"/> (RN-RES-01, SPEC.md §3.9).
/// Compartida por ReservasController.Cancelar (staff) y MePortalController.CancelarReserva
/// (Socio) — antes de esta implementación, el path del Socio no calculaba
/// DentroDePoliticaCancelacion ni generaba ningún reembolso (bug real de Etapa 2, corregido
/// acá centralizando la lógica en un único lugar).
/// </summary>
public class ReembolsoReservaService : IReembolsoReservaService
{
    private readonly ApplicationDbContext _dbContext;

    public ReembolsoReservaService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> CancelarYReembolsarSiCorrespondeAsync(Guid reservaId, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas
            .Include(r => r.Espacio)
            .FirstOrDefaultAsync(r => r.Id == reservaId, cancellationToken)
            ?? throw new InvalidOperationException($"Reserva {reservaId} no encontrada.");

        var inicioReserva = reserva.Fecha.Date + reserva.HoraInicio.ToTimeSpan();
        var dentroDePolitica = DateTime.UtcNow.AddHours(reserva.Espacio.PoliticaCancelacionHoras) <= inicioReserva;

        if (reserva.Estado == EstadoReserva.Pagada && dentroDePolitica && reserva.Importe.HasValue)
        {
            // Medio del pago original de la reserva (RN-RES-01, §3.9): el reembolso se
            // gestiona por el mismo medio, fuera de la plataforma de pago si corresponde.
            var pagoOriginal = await _dbContext.Pagos
                .Where(p => p.ReservaId == reservaId && p.Estado == EstadoPago.Pagada)
                .OrderByDescending(p => p.Fecha)
                .FirstOrDefaultAsync(cancellationToken);

            var reembolso = new Pago
            {
                Id = Guid.NewGuid(),
                SocioId = reserva.SocioId,
                ReservaId = reserva.Id,
                Concepto = "Reembolso de reserva cancelada",
                Fecha = DateTime.UtcNow,
                Importe = Math.Round(reserva.Importe.Value * reserva.Espacio.PorcentajeReembolso / 100m, 2),
                MedioPago = pagoOriginal?.MedioPago ?? MedioPago.Transferencia,
                Estado = EstadoPago.PendienteReembolso
            };

            _dbContext.Pagos.Add(reembolso);
        }

        reserva.Estado = EstadoReserva.Cancelada;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return dentroDePolitica;
    }
}
