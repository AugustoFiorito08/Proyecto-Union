namespace ProyectoUnion.Application.Dtos.GruposFamiliares;

/// <summary>
/// Alta de grupo familiar (SPEC.md §5). El titular se agrega automáticamente como
/// integrante con Parentesco=Titular (RF-GF-04 bis).
/// </summary>
public sealed record CrearGrupoFamiliarRequest(string Nombre, Guid TitularSocioId, string? Observaciones);
