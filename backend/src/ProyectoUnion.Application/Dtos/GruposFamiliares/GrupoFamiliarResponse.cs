namespace ProyectoUnion.Application.Dtos.GruposFamiliares;

public sealed record IntegranteGrupoFamiliarResponse(Guid SocioId, string ApellidoNombres, string? Parentesco);

public sealed record GrupoFamiliarResponse(
    Guid Id,
    string NumeroGrupo,
    string Nombre,
    string Tipo,
    Guid TitularSocioId,
    string TitularApellidoNombres,
    string Estado,
    string? Observaciones,
    string? MotivoBaja,
    DateTime FechaCreacion,
    DateTime? FechaBaja,
    IReadOnlyList<IntegranteGrupoFamiliarResponse> Integrantes);
