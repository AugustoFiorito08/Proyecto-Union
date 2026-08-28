namespace ProyectoUnion.Application.Dtos.Common;

/// <summary>Resultado paginado genérico para listados administrativos (SPEC.md §5).</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
