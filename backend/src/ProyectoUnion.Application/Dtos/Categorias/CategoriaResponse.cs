namespace ProyectoUnion.Application.Dtos.Categorias;

public sealed record CategoriaResponse(Guid Id, string Nombre, string? Descripcion, decimal ValorCuota, string Estado);
