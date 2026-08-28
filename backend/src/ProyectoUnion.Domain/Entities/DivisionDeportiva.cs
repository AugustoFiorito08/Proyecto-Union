namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Estado de una división deportiva. Decisión de implementación (SPEC.md §4.2
/// "DivisionDeportiva.Estado" no enumera valores): se modela como Activa/Inactiva, análogo
/// a Espacio/Amenity, en lugar de reutilizar EstadoActividad (una división no tiene un
/// estado "Finalizada" propio distinto del de su Actividad contenedora).
/// </summary>
public enum EstadoDivisionDeportiva
{
    Activa = 1,
    Inactiva = 2
}

/// <summary>
/// División por edad/género dentro de una Actividad (SPEC.md §4.2 "DivisionDeportiva",
/// RN-ACT-02, §3.17), ej. "Fútbol Infantil Sub13" — distinta de <see cref="Categoria"/>
/// (categoría de socio, define <c>ValorCuota</c>).
/// </summary>
public class DivisionDeportiva : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid ActividadId { get; set; }

    public Actividad Actividad { get; set; } = null!;

    public string Nombre { get; set; } = string.Empty;

    public int? EdadMinima { get; set; }

    public int? EdadMaxima { get; set; }

    public string? Genero { get; set; }

    public string? Dias { get; set; }

    public TimeOnly HorarioInicio { get; set; }

    public TimeOnly HorarioFin { get; set; }

    public EstadoDivisionDeportiva Estado { get; set; } = EstadoDivisionDeportiva.Activa;

    public ICollection<DivisionInstructor> DivisionInstructores { get; set; } = new List<DivisionInstructor>();

    public ICollection<Inscripcion> Inscripciones { get; set; } = new List<Inscripcion>();
}
