namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Relación N:M DivisionDeportiva↔Instructor (SPEC.md §4.2 "DivisionInstructor", RN-ACT-02,
/// §3.17). Clave compuesta (DivisionDeportivaId, InstructorId).
/// </summary>
public class DivisionInstructor
{
    public Guid DivisionDeportivaId { get; set; }

    public DivisionDeportiva DivisionDeportiva { get; set; } = null!;

    public Guid InstructorId { get; set; }

    public Instructor Instructor { get; set; } = null!;
}
