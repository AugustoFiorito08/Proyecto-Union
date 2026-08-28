using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Cuotas;
using ProyectoUnion.Application.Dtos.Espacios;
using ProyectoUnion.Application.Dtos.MePortal;
using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Application.Dtos.Reservas;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Portal del Socio — Reservas (SPEC.md §5 "GET/POST/DELETE /api/me/reservas", §2.2:
/// Reservas "Propio (C/L/B)") y Cuotas/Pagos (§5 "GET /api/me/cuotas", "POST
/// /api/me/cuotas/{id}/pagar", RN-FIN-06 §3.15). El SocioId se resuelve del usuario
/// autenticado (busca el Socio por UsuarioId), nunca se recibe del body/query — evita que un
/// socio vea o accione sobre datos de otro.
/// </summary>
[ApiController]
[Route("api/me")]
[Authorize]
public class MePortalController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IReembolsoReservaService _reembolsoReservaService;
    private readonly IPagoService _pagoService;

    public MePortalController(
        ApplicationDbContext dbContext,
        IReembolsoReservaService reembolsoReservaService,
        IPagoService pagoService)
    {
        _dbContext = dbContext;
        _reembolsoReservaService = reembolsoReservaService;
        _pagoService = pagoService;
    }

    /// <summary>
    /// Espacios disponibles para reservar (SPEC.md §2.2: Socio tiene `L` sobre Espacios).
    /// El Socio no tiene permisos de módulo (`espacios.leer`) como el staff — este endpoint,
    /// no `GET /api/espacios`, es el que usa `/mi-cuenta/reservas/nueva` para poblar el
    /// selector, mismo criterio de <c>[Authorize]</c> simple que el resto de este controller.
    /// Solo espacios Activos.
    /// </summary>
    [HttpGet("espacios")]
    public async Task<ActionResult<IReadOnlyList<EspacioResponse>>> Espacios(CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var espacios = await _dbContext.Espacios
            .AsNoTracking()
            .Include(e => e.EspacioAmenities).ThenInclude(ea => ea.Amenity)
            .Where(e => e.Estado == EstadoEspacio.Activo)
            .OrderBy(e => e.Nombre)
            .ToListAsync(cancellationToken);

        return Ok(espacios.Select(e => new EspacioResponse(
            e.Id, e.Nombre, e.Descripcion, e.Ubicacion, e.Tipo.ToString(), e.Capacidad, e.Precio,
            e.UnidadPrecio.ToString(), e.SolicitarEvaluacion, e.PermitirNoSocios, e.Estado.ToString(),
            e.ImagenUrl, e.PoliticaCancelacionHoras, e.PorcentajeReembolso,
            e.EspacioAmenities.Select(ea => new AmenityResponse(ea.AmenityId, ea.Amenity.Nombre)).ToList()
        )).ToList());
    }

    [HttpGet("reservas")]
    public async Task<ActionResult<IReadOnlyList<ReservaResponse>>> MisReservas(CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var reservas = await _dbContext.Reservas
            .AsNoTracking()
            .Include(r => r.Espacio)
            .Where(r => r.SocioId == socio.Id)
            .OrderByDescending(r => r.Fecha).ThenBy(r => r.HoraInicio)
            .ToListAsync(cancellationToken);

        return Ok(reservas.Select(r => MapearAResponse(r, socio)).ToList());
    }

    [HttpPost("reservas")]
    public async Task<ActionResult<ReservaResponse>> CrearReserva([FromBody] CrearMeReservaRequest request, CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var espacio = await _dbContext.Espacios.FirstOrDefaultAsync(e => e.Id == request.EspacioId, cancellationToken);
        if (espacio is null)
        {
            return BadRequest(new { message = "El espacio indicado no existe." });
        }

        var fechaUtc = DateTime.SpecifyKind(request.Fecha.Date, DateTimeKind.Utc);

        // RF-RES-09 bis (SPEC.md §5): misma regla de anti-superposición que ReservasController.
        var haySuperposicion = await _dbContext.Reservas.AnyAsync(r =>
            r.EspacioId == request.EspacioId &&
            r.Fecha == fechaUtc &&
            (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.PendienteConfirmacion) &&
            r.HoraInicio < request.HoraFin && request.HoraInicio < r.HoraFin,
            cancellationToken);

        if (haySuperposicion)
        {
            return Conflict(new { message = "Ya existe una reserva confirmada o pendiente que se superpone con ese horario para el espacio indicado." });
        }

        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            EspacioId = request.EspacioId,
            Fecha = fechaUtc,
            HoraInicio = request.HoraInicio,
            HoraFin = request.HoraFin,
            Duracion = request.Duracion,
            TipoReserva = (TipoReserva)request.TipoReserva,
            CantidadInvitados = request.CantidadInvitados,
            Observaciones = request.Observaciones,
            Estado = EstadoReserva.PendienteConfirmacion,
            FechaCreacion = DateTime.UtcNow
        };

        _dbContext.Reservas.Add(reserva);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var reservaCreada = await _dbContext.Reservas.Include(r => r.Espacio).FirstAsync(r => r.Id == reserva.Id, cancellationToken);
        return CreatedAtAction(nameof(MisReservas), MapearAResponse(reservaCreada, socio));
    }

    [HttpDelete("reservas/{id:guid}")]
    public async Task<IActionResult> CancelarReserva(Guid id, CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == id && r.SocioId == socio.Id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        if (reserva.Estado is EstadoReserva.Cancelada or EstadoReserva.Rechazada)
        {
            return Conflict(new { message = "La reserva ya está cancelada o rechazada." });
        }

        // RN-RES-01 (SPEC.md §3.9): antes de esta corrección, este path NO calculaba
        // DentroDePoliticaCancelacion ni generaba ningún reembolso (bug real de Etapa 2) —
        // ahora comparte la misma lógica que ReservasController.Cancelar (staff).
        await _reembolsoReservaService.CancelarYReembolsarSiCorrespondeAsync(id, cancellationToken);

        return NoContent();
    }

    /// <summary>Cuotas propias, o de un Grupo Familiar del que el socio sea integrante (RN-FIN-06, SPEC.md §3.15).</summary>
    [HttpGet("cuotas")]
    public async Task<ActionResult<IReadOnlyList<CuotaResponse>>> MisCuotas(CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var cuotas = await _dbContext.Cuotas
            .AsNoTracking()
            .Include(c => c.Socio)
            .Include(c => c.GrupoFamiliar)
            .Where(c => c.SocioId == socio.Id || (c.GrupoFamiliarId != null && c.GrupoFamiliarId == socio.GrupoFamiliarId))
            .OrderByDescending(c => c.Periodo)
            .ToListAsync(cancellationToken);

        return Ok(cuotas.Select(c => new CuotaResponse(
            c.Id,
            c.SocioId,
            c.Socio is not null ? $"{c.Socio.Apellido}, {c.Socio.Nombres}" : null,
            c.GrupoFamiliarId,
            c.GrupoFamiliar?.Nombre,
            c.NumeroCuota,
            c.Periodo,
            c.FechaVencimiento,
            c.Importe,
            c.RecargoMora,
            c.Estado.ToString())).ToList());
    }

    /// <summary>
    /// Pago de una única cuota desde el portal (RN-FIN-06, SPEC.md §3.15): solo cuotas
    /// propias, o de un Grupo Familiar del que el socio sea titular vigente — validado por
    /// IPagoService. Para "pagar todo" (RN-FIN-07, §3.16) el frontend usa POST /api/pagos con
    /// varios CuotaIds, accesible también a un Socio autenticado.
    /// </summary>
    [HttpPost("cuotas/{id:guid}/pagar")]
    public async Task<ActionResult<PagoResponse>> PagarCuota(Guid id, [FromBody] PagarCuotaRequest? request, CancellationToken cancellationToken)
    {
        var socio = await ResolverSocioActualAsync(cancellationToken);
        if (socio is null)
        {
            return Forbid();
        }

        var pagoRequest = new CrearPagoRequest([id], null, null, null, null, null, request?.MedioPago ?? (int)MedioPago.Transferencia, null);
        var resultado = await _pagoService.CrearPagosAsync(pagoRequest, socio, confirmarInmediatamente: true, cancellationToken);

        if (resultado.Estado != ResultadoPagoEstado.Ok)
        {
            return resultado.Estado switch
            {
                ResultadoPagoEstado.NoEncontrado => NotFound(new { message = resultado.Mensaje }),
                ResultadoPagoEstado.Prohibido => Forbid(),
                ResultadoPagoEstado.Conflicto => Conflict(new { message = resultado.Mensaje }),
                _ => BadRequest(new { message = resultado.Mensaje })
            };
        }

        var pago = await _dbContext.Pagos
            .AsNoTracking()
            .Include(p => p.Socio)
            .Include(p => p.Cuota)
            .FirstAsync(p => p.Id == resultado.PagoIds[0], cancellationToken);

        return Ok(new PagoResponse(
            pago.Id, pago.SocioId, pago.Socio is not null ? $"{pago.Socio.Apellido}, {pago.Socio.Nombres}" : null,
            pago.CuotaId, pago.Cuota?.Periodo, pago.ReservaId, null, pago.ConceptoIngresoLibreId, null,
            pago.Concepto, pago.Fecha, pago.Importe, pago.MedioPago.ToString(), pago.Estado.ToString(),
            pago.MercadoPagoTransaccionId, pago.ComprobanteUrl));
    }

    private async Task<Socio?> ResolverSocioActualAsync(CancellationToken cancellationToken)
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (usuarioId is null || !Guid.TryParse(usuarioId, out var usuarioGuid))
        {
            return null;
        }

        return await _dbContext.Socios.FirstOrDefaultAsync(s => s.UsuarioId == usuarioGuid, cancellationToken);
    }

    private static ReservaResponse MapearAResponse(Reserva r, Socio socio) => new(
        r.Id,
        r.SocioId,
        $"{socio.Apellido}, {socio.Nombres}",
        r.NombreContacto,
        r.TelefonoContacto,
        r.EmailContacto,
        r.EspacioId,
        r.Espacio?.Nombre ?? string.Empty,
        r.Fecha,
        r.HoraInicio,
        r.HoraFin,
        r.Duracion,
        r.TipoReserva.ToString(),
        r.CantidadInvitados,
        r.Observaciones,
        r.Importe,
        r.Estado.ToString(),
        r.MotivoRechazo,
        r.FechaCreacion);
}
