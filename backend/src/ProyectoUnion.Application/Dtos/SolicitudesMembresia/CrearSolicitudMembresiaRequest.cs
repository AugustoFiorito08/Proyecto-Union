namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

/// <summary>
/// Alta pública de una Solicitud de Membresía (SPEC.md §5 "POST /api/solicitudes-membresia",
/// [AllowAnonymous]). Crea, en el mismo flujo, la cuenta de acceso (rol NoSocio) que el
/// solicitante usa luego para el seguimiento — ver SolicitudMembresiaService.
/// </summary>
public sealed record CrearSolicitudMembresiaRequest(
    string Nombre,
    string Apellido,
    string DNI,
    DateTime FechaNacimiento,
    string? Genero,
    string Email,
    string? Telefono,
    string? Domicilio,
    string? Localidad,
    string? Provincia,
    Guid? CategoriaPretendidaId,
    string Password);
