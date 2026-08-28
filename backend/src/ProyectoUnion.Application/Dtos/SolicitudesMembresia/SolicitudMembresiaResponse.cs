namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

public sealed record SolicitudMembresiaResponse(
    Guid Id,
    string NumeroSolicitud,
    Guid UsuarioId,
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
    string? CategoriaPretendidaNombre,
    string? DocumentoIdentidadUrl,
    string? FichaMedicaUrl,
    string Estado,
    string? MotivoRechazo,
    string? Observaciones,
    DateTime FechaSolicitud);
