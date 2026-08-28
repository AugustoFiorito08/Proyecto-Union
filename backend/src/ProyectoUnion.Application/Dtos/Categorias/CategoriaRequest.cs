namespace ProyectoUnion.Application.Dtos.Categorias;

public sealed record CategoriaRequest(string Nombre, string? Descripcion, decimal ValorCuota);
