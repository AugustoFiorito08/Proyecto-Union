namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

/// <summary>POST /api/solicitudes-membresia/{id}/adjuntos (SPEC.md §5, RF-SOL-05).</summary>
public sealed record AdjuntosSolicitudMembresiaResponse(
    Guid Id,
    string? DocumentoIdentidadUrl,
    string? FichaMedicaUrl);
