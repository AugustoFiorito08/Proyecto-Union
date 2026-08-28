namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>Body de POST /api/comunicaciones/{id}/programar (SPEC.md §5, NUEVO-SPEC-UI).</summary>
public sealed record ProgramarComunicacionRequest(DateTime FechaProgramada);
