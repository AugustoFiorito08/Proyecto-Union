namespace ProyectoUnion.Application.Dtos.Comunicaciones;

/// <summary>Fila de trazabilidad de un destinatario (GET /api/comunicaciones/{id}/trazabilidad).</summary>
public sealed record ComunicacionDestinatarioResponse(
    Guid Id,
    Guid UsuarioId,
    Guid? SocioId,
    string? SocioNombre,
    string Canal,
    string EstadoEnvio,
    DateTime? FechaEnvio,
    DateTime? FechaLectura,
    string? MotivoFallo);
