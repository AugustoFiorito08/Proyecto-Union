namespace ProyectoUnion.Application.Dtos.Cuotas;

/// <summary>Idempotencia de la generación batch (enunciado Etapa 3): cuántas cuotas se
/// generaron realmente vs. cuántas ya existían para ese período.</summary>
public sealed record GenerarPeriodoResponse(int Generadas, int YaExistian);
