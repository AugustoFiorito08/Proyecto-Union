namespace ProyectoUnion.Application.Dtos.Configuracion;

/// <summary>
/// GET /api/configuracion/publica (SPEC.md §5 sección "Configuración", Etapa 6, endpoint
/// [AllowAnonymous] para el Portal Público). Expone únicamente los datos institucionales del
/// club — nunca MaximaDeudaEnMeses/TipoTarifaFamiliar/ToleranciaAccesoDiasCuotaVencida/etc.,
/// que son reglas de negocio internas sin valor para un visitante anónimo.
/// </summary>
public sealed record ConfiguracionPublicaResponse(
    string? NombreClub,
    string? Cuit,
    string? Direccion,
    string? Telefono,
    string? EmailContacto,
    string? HorariosFuncionamiento);
