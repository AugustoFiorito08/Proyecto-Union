namespace ProyectoUnion.Application.Dtos.Reservas;

public sealed record ActualizarReservaRequest(
    Guid EspacioId,
    DateTime Fecha,
    TimeOnly HoraInicio,
    TimeOnly HoraFin,
    int Duracion,
    int TipoReserva,
    int? CantidadInvitados,
    string? Observaciones,
    decimal? Importe);
