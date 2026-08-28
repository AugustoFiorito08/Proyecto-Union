using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Finanzas;

/// <summary>
/// Implementación de <see cref="IPagoService"/> (RF-FIN-34, RN-FIN-05/06/07, SPEC.md
/// §3.8/§3.15/§3.16). Cada método público hace un único <c>SaveChangesAsync</c> — así "pagar
/// todo" (N cuotas) genera N filas de <see cref="Pago"/> en una única transacción atómica de
/// EF Core (RN-FIN-07, §3.16), sin fraccionar ninguna Cuota individual (RN-FIN-05, §3.8).
/// </summary>
public class PagoService : IPagoService
{
    private readonly ApplicationDbContext _dbContext;

    public PagoService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ResultadoPago> CrearPagosAsync(
        CrearPagoRequest request,
        Socio? socioActual,
        bool confirmarInmediatamente,
        CancellationToken cancellationToken)
    {
        var gruposCompletos = new[]
        {
            request.CuotaIds is { Length: > 0 },
            request.ReservaId.HasValue,
            request.ConceptoIngresoLibreId.HasValue
        }.Count(g => g);

        if (gruposCompletos != 1)
        {
            return ResultadoPago.Invalido("Debe indicar exactamente uno de CuotaIds, ReservaId o ConceptoIngresoLibreId.");
        }

        if (!Enum.IsDefined(typeof(MedioPago), request.MedioPago))
        {
            return ResultadoPago.Invalido("MedioPago inválido.");
        }

        var medioPago = (MedioPago)request.MedioPago;

        if (request.CuotaIds is { Length: > 0 })
        {
            return await CrearPagosDeCuotasAsync(request.CuotaIds, socioActual, confirmarInmediatamente, medioPago, request.MercadoPagoTransaccionId, cancellationToken);
        }

        if (request.ReservaId.HasValue)
        {
            return await CrearPagoDeReservaAsync(request.ReservaId.Value, socioActual, confirmarInmediatamente, medioPago, request.MercadoPagoTransaccionId, cancellationToken);
        }

        return await CrearPagoDeConceptoLibreAsync(request, socioActual, confirmarInmediatamente, medioPago, cancellationToken);
    }

    public async Task<bool> ConfirmarPagoAsync(Guid pagoId, string? mercadoPagoTransaccionId, CancellationToken cancellationToken)
    {
        var pago = await _dbContext.Pagos.FirstOrDefaultAsync(p => p.Id == pagoId, cancellationToken);
        if (pago is null)
        {
            return false;
        }

        if (pago.Estado == EstadoPago.Pagada)
        {
            return true; // Idempotente: MP puede reenviar la misma notificación.
        }

        pago.Estado = EstadoPago.Pagada;
        if (!string.IsNullOrWhiteSpace(mercadoPagoTransaccionId))
        {
            pago.MercadoPagoTransaccionId = mercadoPagoTransaccionId;
        }

        if (pago.CuotaId.HasValue)
        {
            var cuota = await _dbContext.Cuotas.FirstOrDefaultAsync(c => c.Id == pago.CuotaId.Value, cancellationToken);
            if (cuota is not null)
            {
                cuota.Estado = EstadoCuota.Pagada;
            }
        }
        else if (pago.ReservaId.HasValue)
        {
            var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == pago.ReservaId.Value, cancellationToken);
            if (reserva is not null)
            {
                reserva.Estado = EstadoReserva.Pagada;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RechazarPagoAsync(Guid pagoId, CancellationToken cancellationToken)
    {
        var pago = await _dbContext.Pagos.FirstOrDefaultAsync(p => p.Id == pagoId, cancellationToken);
        if (pago is null)
        {
            return false;
        }

        if (pago.Estado != EstadoPago.Pendiente)
        {
            return true;
        }

        pago.Estado = EstadoPago.Rechazada;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task<ResultadoPago> CrearPagosDeCuotasAsync(
        Guid[] cuotaIds, Socio? socioActual, bool confirmarInmediatamente, MedioPago medioPago, string? mpTransaccionId, CancellationToken cancellationToken)
    {
        var idsDistintos = cuotaIds.Distinct().ToArray();
        var cuotas = await _dbContext.Cuotas.Where(c => idsDistintos.Contains(c.Id)).ToListAsync(cancellationToken);

        if (cuotas.Count != idsDistintos.Length)
        {
            return ResultadoPago.NoEncontrado("Una o más cuotas indicadas no existen.");
        }

        if (cuotas.Any(c => c.Estado == EstadoCuota.Pagada))
        {
            return ResultadoPago.Conflicto("Una o más cuotas indicadas ya están pagadas.");
        }

        if (socioActual is not null)
        {
            foreach (var cuota in cuotas)
            {
                if (!await PuedePagarCuotaAsync(cuota, socioActual, cancellationToken))
                {
                    return ResultadoPago.Prohibido("No tiene permiso para pagar una o más de las cuotas indicadas (RN-FIN-06).");
                }
            }
        }

        var pagoIds = new List<Guid>();
        foreach (var cuota in cuotas)
        {
            var pago = new Pago
            {
                Id = Guid.NewGuid(),
                SocioId = cuota.SocioId ?? await ObtenerTitularVigenteIdAsync(cuota.GrupoFamiliarId, cancellationToken),
                CuotaId = cuota.Id,
                Concepto = $"Cuota {cuota.Periodo}",
                Fecha = DateTime.UtcNow,
                Importe = cuota.Importe,
                MedioPago = medioPago,
                Estado = confirmarInmediatamente ? EstadoPago.Pagada : EstadoPago.Pendiente,
                MercadoPagoTransaccionId = mpTransaccionId
            };

            _dbContext.Pagos.Add(pago);
            pagoIds.Add(pago.Id);

            if (confirmarInmediatamente)
            {
                cuota.Estado = EstadoCuota.Pagada;
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoPago.Ok(pagoIds);
    }

    private async Task<ResultadoPago> CrearPagoDeReservaAsync(
        Guid reservaId, Socio? socioActual, bool confirmarInmediatamente, MedioPago medioPago, string? mpTransaccionId, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == reservaId, cancellationToken);
        if (reserva is null)
        {
            return ResultadoPago.NoEncontrado("La reserva indicada no existe.");
        }

        if (reserva.Estado == EstadoReserva.Pagada)
        {
            return ResultadoPago.Conflicto("La reserva ya está pagada.");
        }

        if (!reserva.Importe.HasValue)
        {
            return ResultadoPago.Invalido("La reserva no tiene un importe definido.");
        }

        if (socioActual is not null && reserva.SocioId != socioActual.Id)
        {
            return ResultadoPago.Prohibido("No tiene permiso para pagar esta reserva.");
        }

        var pago = new Pago
        {
            Id = Guid.NewGuid(),
            SocioId = reserva.SocioId,
            ReservaId = reserva.Id,
            Concepto = "Reserva de espacio",
            Fecha = DateTime.UtcNow,
            Importe = reserva.Importe.Value,
            MedioPago = medioPago,
            Estado = confirmarInmediatamente ? EstadoPago.Pagada : EstadoPago.Pendiente,
            MercadoPagoTransaccionId = mpTransaccionId
        };

        _dbContext.Pagos.Add(pago);

        if (confirmarInmediatamente)
        {
            reserva.Estado = EstadoReserva.Pagada;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoPago.Ok(new[] { pago.Id });
    }

    private async Task<ResultadoPago> CrearPagoDeConceptoLibreAsync(
        CrearPagoRequest request, Socio? socioActual, bool confirmarInmediatamente, MedioPago medioPago, CancellationToken cancellationToken)
    {
        // RN-FIN-06 (SPEC.md §3.15) habilita a un Socio a pagar sus propias cuotas, no a
        // registrar ingresos libres (esto es exclusivamente de staff, matriz §2.2).
        if (socioActual is not null)
        {
            return ResultadoPago.Prohibido("Un Socio no puede registrar pagos de ingresos libres.");
        }

        var concepto = await _dbContext.ConceptosIngresoLibre.FirstOrDefaultAsync(c => c.Id == request.ConceptoIngresoLibreId!.Value, cancellationToken);
        if (concepto is null)
        {
            return ResultadoPago.NoEncontrado("El concepto de ingreso libre indicado no existe.");
        }

        if (!request.Importe.HasValue || request.Importe.Value <= 0)
        {
            return ResultadoPago.Invalido("Debe indicar un importe válido.");
        }

        if (request.SocioId.HasValue && !await _dbContext.Socios.AnyAsync(s => s.Id == request.SocioId.Value, cancellationToken))
        {
            return ResultadoPago.Invalido("El socio indicado no existe.");
        }

        var pago = new Pago
        {
            Id = Guid.NewGuid(),
            SocioId = request.SocioId,
            ConceptoIngresoLibreId = concepto.Id,
            Concepto = string.IsNullOrWhiteSpace(request.Concepto) ? concepto.Nombre : request.Concepto,
            Fecha = DateTime.UtcNow,
            Importe = request.Importe.Value,
            MedioPago = medioPago,
            Estado = confirmarInmediatamente ? EstadoPago.Pagada : EstadoPago.Pendiente,
            MercadoPagoTransaccionId = request.MercadoPagoTransaccionId
        };

        _dbContext.Pagos.Add(pago);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return ResultadoPago.Ok(new[] { pago.Id });
    }

    /// <summary>RN-FIN-06 (SPEC.md §3.15): propia, o de un grupo familiar del que sea titular vigente.</summary>
    private async Task<bool> PuedePagarCuotaAsync(Cuota cuota, Socio socioActual, CancellationToken cancellationToken)
    {
        if (cuota.SocioId == socioActual.Id)
        {
            return true;
        }

        if (!cuota.GrupoFamiliarId.HasValue)
        {
            return false;
        }

        var grupo = await _dbContext.GruposFamiliares.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == cuota.GrupoFamiliarId.Value, cancellationToken);

        return grupo is not null && grupo.TitularSocioId == socioActual.Id;
    }

    private async Task<Guid?> ObtenerTitularVigenteIdAsync(Guid? grupoFamiliarId, CancellationToken cancellationToken)
    {
        if (!grupoFamiliarId.HasValue)
        {
            return null;
        }

        var grupo = await _dbContext.GruposFamiliares.AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == grupoFamiliarId.Value, cancellationToken);

        return grupo?.TitularSocioId;
    }
}
