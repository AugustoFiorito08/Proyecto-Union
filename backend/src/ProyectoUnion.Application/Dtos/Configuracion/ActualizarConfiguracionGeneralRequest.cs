namespace ProyectoUnion.Application.Dtos.Configuracion;

public sealed record ActualizarConfiguracionGeneralRequest(
    int MaximaDeudaEnMeses,
    int TipoTarifaFamiliar,
    decimal? TarifaPlanaGrupoImporte,
    int ToleranciaAccesoDiasCuotaVencida);
