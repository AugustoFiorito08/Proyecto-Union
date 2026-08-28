namespace ProyectoUnion.Application.Dtos.InstructorPortal;

public sealed record InscriptoPortalResponse(
    Guid SocioId,
    string ApellidoNombres,
    DateTime FechaInscripcion,
    string Estado);
