using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Reservas;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Reservas de Espacios, por staff (SPEC.md §5 "Espacios y Reservas", §4.2
/// "Reserva"). Aplica la anti-superposición horaria (RF-RES-09 bis) y, al cancelar, delega en
/// IReembolsoReservaService (RN-RES-01, §3.9, Etapa 3) el cálculo de
/// <c>DentroDePoliticaCancelacion</c> y la generación del reembolso pendiente — misma lógica
/// compartida con MePortalController.CancelarReserva.
/// </summary>
[ApiController]
[Route("api/reservas")]
[Authorize]
public class ReservasController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IReembolsoReservaService _reembolsoReservaService;

    public ReservasController(ApplicationDbContext dbContext, IReembolsoReservaService reembolsoReservaService)
    {
        _dbContext = dbContext;
        _reembolsoReservaService = reembolsoReservaService;
    }

    [HttpGet]
    [Authorize(Policy = "reservas.leer")]
    public async Task<ActionResult<PagedResult<ReservaResponse>>> Listar(
        [FromQuery] Guid? espacioId,
        [FromQuery] DateTime? fecha,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = ReservasConIncludes();

        if (espacioId.HasValue)
        {
            query = query.Where(r => r.EspacioId == espacioId.Value);
        }

        if (fecha.HasValue)
        {
            var fechaFiltro = DateTime.SpecifyKind(fecha.Value.Date, DateTimeKind.Utc);
            query = query.Where(r => r.Fecha == fechaFiltro);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoReserva)estado.Value;
            query = query.Where(r => r.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var reservas = await query
            .OrderBy(r => r.Fecha).ThenBy(r => r.HoraInicio)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<ReservaResponse>(reservas.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "reservas.leer")]
    public async Task<ActionResult<ReservaResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var reserva = await ReservasConIncludes().FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(reserva));
    }

    [HttpPost]
    [Authorize(Policy = "reservas.crear")]
    public async Task<ActionResult<ReservaResponse>> Crear([FromBody] CrearReservaRequest request, CancellationToken cancellationToken)
    {
        var espacio = await _dbContext.Espacios.FirstOrDefaultAsync(e => e.Id == request.EspacioId, cancellationToken);
        if (espacio is null)
        {
            return BadRequest(new { message = "El espacio indicado no existe." });
        }

        if (request.SocioId.HasValue)
        {
            if (!await _dbContext.Socios.AnyAsync(s => s.Id == request.SocioId.Value, cancellationToken))
            {
                return BadRequest(new { message = "El socio indicado no existe." });
            }
        }
        else if (!espacio.PermitirNoSocios)
        {
            return BadRequest(new { message = "Este espacio no admite reservas de No Socios." });
        }

        var fechaUtc = AsUtc(request.Fecha.Date);

        // RF-RES-09 bis (SPEC.md §4.2/§5): anti-superposición horaria contra reservas
        // Confirmada/PendienteConfirmacion del mismo Espacio+Fecha.
        if (await HaySuperposicionAsync(request.EspacioId, fechaUtc, request.HoraInicio, request.HoraFin, null, cancellationToken))
        {
            return Conflict(new { message = "Ya existe una reserva confirmada o pendiente que se superpone con ese horario para el espacio indicado." });
        }

        var reserva = new Reserva
        {
            Id = Guid.NewGuid(),
            SocioId = request.SocioId,
            NombreContacto = request.SocioId.HasValue ? null : request.NombreContacto,
            TelefonoContacto = request.SocioId.HasValue ? null : request.TelefonoContacto,
            EmailContacto = request.SocioId.HasValue ? null : request.EmailContacto,
            EspacioId = request.EspacioId,
            Fecha = fechaUtc,
            HoraInicio = request.HoraInicio,
            HoraFin = request.HoraFin,
            Duracion = request.Duracion,
            TipoReserva = (TipoReserva)request.TipoReserva,
            CantidadInvitados = request.CantidadInvitados,
            Observaciones = request.Observaciones,
            Importe = request.Importe,
            Estado = EstadoReserva.PendienteConfirmacion,
            FechaCreacion = DateTime.UtcNow
        };

        _dbContext.Reservas.Add(reserva);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var reservaCreada = await ReservasConIncludes().FirstAsync(r => r.Id == reserva.Id, cancellationToken);
        return CreatedAtAction(nameof(Obtener), new { id = reserva.Id }, MapearAResponse(reservaCreada));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "reservas.editar")]
    public async Task<ActionResult<ReservaResponse>> Actualizar(Guid id, [FromBody] ActualizarReservaRequest request, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        if (reserva.Estado is not (EstadoReserva.PendienteConfirmacion or EstadoReserva.Confirmada))
        {
            return Conflict(new { message = "Solo se pueden editar reservas Pendientes o Confirmadas." });
        }

        if (!await _dbContext.Espacios.AnyAsync(e => e.Id == request.EspacioId, cancellationToken))
        {
            return BadRequest(new { message = "El espacio indicado no existe." });
        }

        var fechaUtc = AsUtc(request.Fecha.Date);

        if (await HaySuperposicionAsync(request.EspacioId, fechaUtc, request.HoraInicio, request.HoraFin, id, cancellationToken))
        {
            return Conflict(new { message = "Ya existe una reserva confirmada o pendiente que se superpone con ese horario para el espacio indicado." });
        }

        reserva.EspacioId = request.EspacioId;
        reserva.Fecha = fechaUtc;
        reserva.HoraInicio = request.HoraInicio;
        reserva.HoraFin = request.HoraFin;
        reserva.Duracion = request.Duracion;
        reserva.TipoReserva = (TipoReserva)request.TipoReserva;
        reserva.CantidadInvitados = request.CantidadInvitados;
        reserva.Observaciones = request.Observaciones;
        reserva.Importe = request.Importe;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var reservaActualizada = await ReservasConIncludes().FirstAsync(r => r.Id == id, cancellationToken);
        return Ok(MapearAResponse(reservaActualizada));
    }

    [HttpPost("{id:guid}/confirmar")]
    [Authorize(Policy = "reservas.editar")]
    public async Task<IActionResult> Confirmar(Guid id, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        if (reserva.Estado != EstadoReserva.PendienteConfirmacion)
        {
            return Conflict(new { message = "Solo se pueden confirmar reservas Pendientes de confirmación." });
        }

        reserva.Estado = EstadoReserva.Confirmada;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/rechazar")]
    [Authorize(Policy = "reservas.editar")]
    public async Task<IActionResult> Rechazar(Guid id, [FromBody] RechazarReservaRequest request, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        if (reserva.Estado != EstadoReserva.PendienteConfirmacion)
        {
            return Conflict(new { message = "Solo se pueden rechazar reservas Pendientes de confirmación." });
        }

        reserva.Estado = EstadoReserva.Rechazada;
        reserva.MotivoRechazo = request.Motivo;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/cancelar")]
    [Authorize(Policy = "reservas.baja")]
    public async Task<ActionResult<CancelarReservaResponse>> Cancelar(Guid id, CancellationToken cancellationToken)
    {
        var reserva = await _dbContext.Reservas.FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        if (reserva is null)
        {
            return NotFound();
        }

        if (reserva.Estado is EstadoReserva.Cancelada or EstadoReserva.Rechazada)
        {
            return Conflict(new { message = "La reserva ya está cancelada o rechazada." });
        }

        // RN-RES-01 (SPEC.md §3.9, Etapa 3): calcula DentroDePoliticaCancelacion y genera el
        // reembolso pendiente si la reserva estaba Pagada — lógica compartida con
        // MePortalController.CancelarReserva.
        var dentroDePolitica = await _reembolsoReservaService.CancelarYReembolsarSiCorrespondeAsync(id, cancellationToken);

        var reservaCancelada = await ReservasConIncludes().FirstAsync(r => r.Id == id, cancellationToken);
        return Ok(new CancelarReservaResponse(MapearAResponse(reservaCancelada), dentroDePolitica));
    }

    private async Task<bool> HaySuperposicionAsync(
        Guid espacioId, DateTime fecha, TimeOnly horaInicio, TimeOnly horaFin, Guid? excluirReservaId, CancellationToken cancellationToken)
    {
        var query = _dbContext.Reservas.Where(r =>
            r.EspacioId == espacioId &&
            r.Fecha == fecha &&
            (r.Estado == EstadoReserva.Confirmada || r.Estado == EstadoReserva.PendienteConfirmacion));

        if (excluirReservaId.HasValue)
        {
            query = query.Where(r => r.Id != excluirReservaId.Value);
        }

        // Superposición real de rango (RF-RES-09 bis): existente.HoraInicio < nueva.HoraFin
        // && nueva.HoraInicio < existente.HoraFin.
        return await query.AnyAsync(r => r.HoraInicio < horaFin && horaInicio < r.HoraFin, cancellationToken);
    }

    private IQueryable<Reserva> ReservasConIncludes() =>
        _dbContext.Reservas
            .AsNoTracking()
            .Include(r => r.Socio)
            .Include(r => r.Espacio);

    private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static ReservaResponse MapearAResponse(Reserva r) => new(
        r.Id,
        r.SocioId,
        r.Socio is not null ? $"{r.Socio.Apellido}, {r.Socio.Nombres}" : null,
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
