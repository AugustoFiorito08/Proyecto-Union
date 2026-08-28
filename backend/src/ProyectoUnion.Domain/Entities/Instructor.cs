namespace ProyectoUnion.Domain.Entities;

public enum EstadoInstructor
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Instructor con login propio (SPEC.md §4.2 "Instructor", NUEVO-SPEC). Accede al
/// mini-portal (<c>/api/instructor/*</c>) resolviendo sus actividades/divisiones propias a
/// partir de <see cref="UsuarioId"/> vía <see cref="ActividadInstructor"/>/<see cref="DivisionInstructor"/>.
/// El alta (<c>POST /api/instructores</c>) crea el <see cref="ApplicationUser"/> asociado con
/// rol "Instructor" (ya sembrado desde Etapa 0) y contraseña temporal (RN-LOG-01).
/// </summary>
public class Instructor : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public ApplicationUser Usuario { get; set; } = null!;

    public string Apellido { get; set; } = string.Empty;

    public string Nombres { get; set; } = string.Empty;

    public string DNI { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? Especialidad { get; set; }

    public EstadoInstructor Estado { get; set; } = EstadoInstructor.Activo;

    public ICollection<ActividadInstructor> ActividadInstructores { get; set; } = new List<ActividadInstructor>();

    public ICollection<DivisionInstructor> DivisionInstructores { get; set; } = new List<DivisionInstructor>();
}
