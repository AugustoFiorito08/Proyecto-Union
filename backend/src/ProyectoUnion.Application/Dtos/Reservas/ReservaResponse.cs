namespace ProyectoUnion.Application.Dtos.Reservas;

public sealed record ReservaResponse(
    Guid Id,
    Guid? SocioId,
    string? SocioApellidoNombres,
    string? NombreContacto,
    string? TelefonoContacto,
    string? EmailContacto,
    Guid EspacioId,
    string EspacioNombre,
    DateTime Fecha,
    TimeOnly HoraInicio,
    TimeOnly HoraFin,
    int Duracion,
    string TipoReserva,
    int? CantidadInvitados,
    string? Observaciones,
    decimal? Importe,
    string Estado,
    string? MotivoRechazo,
    DateTime FechaCreacion);
