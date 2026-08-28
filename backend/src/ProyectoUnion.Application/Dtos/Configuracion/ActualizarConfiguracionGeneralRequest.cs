namespace ProyectoUnion.Application.Dtos.Configuracion;

public sealed record ActualizarConfiguracionGeneralRequest(
    int MaximaDeudaEnMeses,
    int TipoTarifaFamiliar,
    decimal? TarifaPlanaGrupoImporte,
    int ToleranciaAccesoDiasCuotaVencida,
    string? NombreClub,
    string? Cuit,
    string? Direccion,
    string? Telefono,
    string? EmailContacto,
    string? HorariosFuncionamiento);
