namespace ProyectoUnion.Domain.Entities;

public enum EstadoInscripcion
{
    Activa = 1,
    Cancelada = 2
}

/// <summary>
/// Inscripción de un Socio a una Actividad (SPEC.md §4.2 "Inscripcion"), opcionalmente a una
/// <see cref="DivisionDeportiva"/> puntual dentro de ella (RN-ACT-02, §3.17). Constraint
/// "único (SocioId, ActividadId) mientras Estado=Activa" implementado como índice único
/// filtrado en <c>InscripcionConfiguration</c> (<c>HasFilter</c>).
/// </summary>
public class Inscripcion : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid SocioId { get; set; }

    public Socio Socio { get; set; } = null!;

    public Guid ActividadId { get; set; }

    public Actividad Actividad { get; set; } = null!;

    public Guid? DivisionDeportivaId { get; set; }

    public DivisionDeportiva? DivisionDeportiva { get; set; }

    public DateTime FechaInscripcion { get; set; } = DateTime.UtcNow;

    public EstadoInscripcion Estado { get; set; } = EstadoInscripcion.Activa;
}
