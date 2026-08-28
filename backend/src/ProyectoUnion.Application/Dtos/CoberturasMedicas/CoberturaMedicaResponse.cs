namespace ProyectoUnion.Application.Dtos.CoberturasMedicas;

public sealed record CoberturaMedicaResponse(Guid Id, string Nombre, string? Descripcion, string Estado);
