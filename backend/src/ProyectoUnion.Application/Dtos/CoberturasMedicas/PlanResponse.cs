namespace ProyectoUnion.Application.Dtos.CoberturasMedicas;

public sealed record PlanResponse(Guid Id, Guid CoberturaMedicaId, string Nombre, string Estado);
