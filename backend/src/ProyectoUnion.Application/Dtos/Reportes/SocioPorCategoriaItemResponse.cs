namespace ProyectoUnion.Application.Dtos.Reportes;

/// <summary>
/// Fila de "conteo de Socios por Categoría" dentro de GET /api/reportes/socios (Etapa 7),
/// solo sobre Socios en Estado=Activo. Campo plano <see cref="CategoriaNombre"/> en lugar de
/// objeto Categoria anidado (convención de contrato de Etapas 0-6).
/// </summary>
public sealed record SocioPorCategoriaItemResponse(
    Guid CategoriaId,
    string CategoriaNombre,
    int Cantidad);
