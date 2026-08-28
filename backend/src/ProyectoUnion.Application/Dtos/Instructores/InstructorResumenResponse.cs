namespace ProyectoUnion.Application.Dtos.Instructores;

/// <summary>Campo plano reutilizado en respuestas de Actividad/DivisionDeportiva (convención §"relaciones en las respuestas").</summary>
public sealed record InstructorResumenResponse(Guid InstructorId, string InstructorApellidoNombres);
