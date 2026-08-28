namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Relación N:M Actividad↔Instructor (SPEC.md §4.2 "ActividadInstructor", RN-ACT-02, §3.17).
/// Clave compuesta (ActividadId, InstructorId) — ver ActividadInstructorConfiguration.
/// </summary>
public class ActividadInstructor
{
    public Guid ActividadId { get; set; }

    public Actividad Actividad { get; set; } = null!;

    public Guid InstructorId { get; set; }

    public Instructor Instructor { get; set; } = null!;
}
