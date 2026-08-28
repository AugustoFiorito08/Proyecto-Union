namespace ProyectoUnion.Application.Dtos.GruposFamiliares;

/// <summary>RN-GF-01 (SPEC.md §3.4): reasigna la titularidad del grupo a otro integrante.</summary>
public sealed record CambiarTitularRequest(Guid NuevoTitularSocioId);
