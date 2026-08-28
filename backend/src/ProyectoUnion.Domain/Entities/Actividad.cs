namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Modalidad de inscripción a una Actividad (SPEC.md §4.2 "Actividad.ModalidadInscripcion",
/// NUEVO-SPEC-UI).
/// </summary>
public enum ModalidadInscripcion
{
    HorarioFijo = 1,
    PaseLibre = 2
}

public enum EstadoActividad
{
    Activa = 1,
    Suspendida = 2,
    Finalizada = 3
}

/// <summary>
/// Actividad del club (SPEC.md §4.2 "Actividad"). El FK único <c>InstructorId</c> del
/// modelo v3 fue reemplazado por la relación N:M <see cref="ActividadInstructor"/>
/// (RN-ACT-02, §3.17). No puede quedar en <see cref="EstadoActividad.Activa"/> sin al menos
/// un instructor asignado (directo, si no tiene divisiones; o por división, si las tiene) —
/// validado en <c>ActividadesController</c>, no acá (regla de negocio, no de integridad
/// referencial).
/// </summary>
public class Actividad : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public Guid CategoriaId { get; set; }

    public Categoria Categoria { get; set; } = null!;

    public Guid? EspacioId { get; set; }

    public Espacio? Espacio { get; set; }

    public decimal? Precio { get; set; }

    public ModalidadInscripcion ModalidadInscripcion { get; set; }

    public int CupoMinimo { get; set; }

    public int CupoMaximo { get; set; }

    public string? Dias { get; set; }

    public TimeOnly HorarioInicio { get; set; }

    public TimeOnly HorarioFin { get; set; }

    public int Duracion { get; set; }

    public EstadoActividad Estado { get; set; } = EstadoActividad.Suspendida;

    public string? ImagenUrl { get; set; }

    public DateTime FechaUltimaModificacion { get; set; } = DateTime.UtcNow;

    public ICollection<ActividadInstructor> ActividadInstructores { get; set; } = new List<ActividadInstructor>();

    public ICollection<DivisionDeportiva> Divisiones { get; set; } = new List<DivisionDeportiva>();

    public ICollection<Inscripcion> Inscripciones { get; set; } = new List<Inscripcion>();
}
