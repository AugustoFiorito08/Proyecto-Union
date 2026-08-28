namespace ProyectoUnion.Application.Dtos.ControlAcceso;

/// <summary>Fila de historial de accesos (SPEC.md §5 "GET /api/control-acceso/historial").</summary>
public sealed record RegistroAccesoResponse(
    Guid Id,
    DateTime FechaHora,
    string Resultado,
    string? MotivoDenegacion,
    Guid? SocioId,
    string? SocioApellidoNombres,
    Guid OperadorUsuarioId,
    string OperadorEmail);
