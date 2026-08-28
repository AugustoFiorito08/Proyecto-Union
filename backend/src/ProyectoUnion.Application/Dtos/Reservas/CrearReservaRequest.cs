namespace ProyectoUnion.Application.Dtos.Reservas;

/// <summary>
/// Alta de reserva por staff (SPEC.md §5 "POST /api/reservas"). <see cref="SocioId"/> nulo
/// identifica una reserva de No Socio gestionada por staff; en ese caso se completan
/// <see cref="NombreContacto"/>/<see cref="TelefonoContacto"/>/<see cref="EmailContacto"/>.
/// </summary>
public sealed record CrearReservaRequest(
    Guid? SocioId,
    string? NombreContacto,
    string? TelefonoContacto,
    string? EmailContacto,
    Guid EspacioId,
    DateTime Fecha,
    TimeOnly HoraInicio,
    TimeOnly HoraFin,
    int Duracion,
    int TipoReserva,
    int? CantidadInvitados,
    string? Observaciones,
    decimal? Importe);
