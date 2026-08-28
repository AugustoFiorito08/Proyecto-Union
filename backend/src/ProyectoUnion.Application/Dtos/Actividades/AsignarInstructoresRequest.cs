namespace ProyectoUnion.Application.Dtos.Actividades;

/// <summary>Reemplaza el conjunto completo de instructores asignados a la actividad (SPEC.md §5, PUT .../instructores).</summary>
public sealed record AsignarInstructoresRequest(IReadOnlyList<Guid> InstructorIds);
