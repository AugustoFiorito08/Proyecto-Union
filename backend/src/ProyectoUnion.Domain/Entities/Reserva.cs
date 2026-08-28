namespace ProyectoUnion.Domain.Entities;

public enum TipoReserva
{
    Partido = 1,
    Entrenamiento = 2,
    ReunionDirectiva = 3,
    Capacitacion = 4,
    Evento = 5,
    Otro = 6
}

public enum EstadoReserva
{
    PendienteConfirmacion = 1,
    Confirmada = 2,
    Rechazada = 3,
    Pagada = 4,
    Cancelada = 5
}

/// <summary>
/// Reserva de un Espacio (SPEC.md §4.2 "Reserva"). <see cref="SocioId"/> es nullable para
/// reservas de No Socio gestionadas por staff (en cuyo caso se completan los campos de
/// contacto). Constraint de anti-superposición horaria (RF-RES-09 bis, §5) validado en
/// <c>ReservasController</c>, no a nivel de base de datos (el rango de superposición depende
/// del Estado de la reserva existente).
/// </summary>
public class Reserva : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid? SocioId { get; set; }

    public Socio? Socio { get; set; }

    /// <summary>Solo se completa si <see cref="SocioId"/> es null.</summary>
    public string? NombreContacto { get; set; }

    public string? TelefonoContacto { get; set; }

    public string? EmailContacto { get; set; }

    public Guid EspacioId { get; set; }

    public Espacio Espacio { get; set; } = null!;

    /// <summary>Solo componente de fecha (sin horario) — el horario va en HoraInicio/HoraFin.</summary>
    public DateTime Fecha { get; set; }

    public TimeOnly HoraInicio { get; set; }

    public TimeOnly HoraFin { get; set; }

    public int Duracion { get; set; }

    public TipoReserva TipoReserva { get; set; }

    public int? CantidadInvitados { get; set; }

    public string? Observaciones { get; set; }

    public decimal? Importe { get; set; }

    public EstadoReserva Estado { get; set; } = EstadoReserva.PendienteConfirmacion;

    public string? MotivoRechazo { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}
