namespace ProyectoUnion.Application.Dtos.GruposFamiliares;

/// <summary>Parentesco: 1=Titular, 2=Conyuge, 3=Hijo (ver enum Domain.Entities.Parentesco).</summary>
public sealed record AgregarIntegranteRequest(Guid SocioId, int Parentesco);
