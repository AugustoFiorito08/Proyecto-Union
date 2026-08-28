namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>Respuesta de POST /api/comunicaciones/{id}/adjuntos (SPEC.md §5, NUEVO-SPEC-UI).</summary>
public sealed record ComunicacionAdjuntoResponse(Guid Id, string ArchivoUrl, string NombreArchivo);
