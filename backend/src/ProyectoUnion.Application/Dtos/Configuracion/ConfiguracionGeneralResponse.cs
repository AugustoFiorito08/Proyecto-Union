namespace ProyectoUnion.Application.Dtos.Configuracion;

public sealed record ConfiguracionGeneralResponse(
    int MaximaDeudaEnMeses,
    string TipoTarifaFamiliar,
    decimal? TarifaPlanaGrupoImporte);
