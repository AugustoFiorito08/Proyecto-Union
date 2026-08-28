namespace ProyectoUnion.Application.Dtos.MePortal;

/// <summary>
/// Alta de reserva desde el Portal del Socio (SPEC.md §5 "POST /api/me/reservas"). No
/// incluye SocioId: se resuelve del usuario autenticado, nunca del body (evita que un socio
/// reserve a nombre de otro).
/// </summary>
public sealed record CrearMeReservaRequest(
    Guid EspacioId,
    DateTime Fecha,
    TimeOnly HoraInicio,
    TimeOnly HoraFin,
    int Duracion,
    int TipoReserva,
    int? CantidadInvitados,
    string? Observaciones);
