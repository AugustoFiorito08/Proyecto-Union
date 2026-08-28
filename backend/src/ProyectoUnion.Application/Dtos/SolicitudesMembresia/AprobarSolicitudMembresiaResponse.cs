namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

/// <summary>
/// POST /api/solicitudes-membresia/{id}/aprobar (SPEC.md §5, RF-SOL-13): además de marcar la
/// solicitud Aprobada, informa el Socio recién dado de alta.
/// </summary>
public sealed record AprobarSolicitudMembresiaResponse(
    Guid SolicitudId,
    string Estado,
    Guid SocioId,
    string NumeroSocio);
