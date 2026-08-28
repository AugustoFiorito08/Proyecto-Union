namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

/// <summary>
/// PUT /api/solicitudes-membresia/{id} (SPEC.md §2.2, nota al pie: Empleado puede "revisar y
/// adjuntar observaciones" a una solicitud, pero no aprobarla/rechazarla). Solo aplica sobre
/// una solicitud en Estado=Pendiente.
/// </summary>
public sealed record ActualizarSolicitudMembresiaRequest(string? Observaciones);
