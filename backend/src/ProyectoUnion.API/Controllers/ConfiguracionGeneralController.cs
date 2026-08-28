using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Configuracion;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Configuración General del sistema (SPEC.md §5 "GET/PUT /api/configuracion/general", §4.2
/// "ConfiguracionGeneral", enunciado Etapa 3). Fila singleton (<see cref="ConfiguracionGeneral.IdFijo"/>,
/// sembrada en DbSeeder). Acceso exclusivo SuperAdmin (matriz §2.2: Administrador "—" en esta
/// fila, RN-ADM-01 §3.19) — ver "configuracion.general.leer"/"configuracion.general.editar",
/// seedeados solo para el rol SuperAdministrador.
/// </summary>
[ApiController]
[Route("api/configuracion/general")]
[Authorize]
public class ConfiguracionGeneralController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ConfiguracionGeneralController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "configuracion.general.leer")]
    public async Task<ActionResult<ConfiguracionGeneralResponse>> Obtener(CancellationToken cancellationToken)
    {
        var configuracion = await ObtenerOCrearAsync(cancellationToken);
        return Ok(MapearAResponse(configuracion));
    }

    [HttpPut]
    [Authorize(Policy = "configuracion.general.editar")]
    public async Task<ActionResult<ConfiguracionGeneralResponse>> Actualizar(
        [FromBody] ActualizarConfiguracionGeneralRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(typeof(TipoTarifaFamiliar), request.TipoTarifaFamiliar))
        {
            return BadRequest(new { message = "TipoTarifaFamiliar inválido." });
        }

        var tipoTarifaFamiliar = (TipoTarifaFamiliar)request.TipoTarifaFamiliar;

        if (tipoTarifaFamiliar == TipoTarifaFamiliar.TarifaPlanaGrupo && !request.TarifaPlanaGrupoImporte.HasValue)
        {
            return BadRequest(new { message = "TarifaPlanaGrupoImporte es obligatorio cuando TipoTarifaFamiliar es TarifaPlanaGrupo." });
        }

        if (request.MaximaDeudaEnMeses < 1)
        {
            return BadRequest(new { message = "MaximaDeudaEnMeses debe ser al menos 1." });
        }

        var configuracion = await ObtenerOCrearAsync(cancellationToken);

        configuracion.MaximaDeudaEnMeses = request.MaximaDeudaEnMeses;
        configuracion.TipoTarifaFamiliar = tipoTarifaFamiliar;
        configuracion.TarifaPlanaGrupoImporte = tipoTarifaFamiliar == TipoTarifaFamiliar.TarifaPlanaGrupo
            ? request.TarifaPlanaGrupoImporte
            : null;
        configuracion.ToleranciaAccesoDiasCuotaVencida = request.ToleranciaAccesoDiasCuotaVencida;
        configuracion.NombreClub = request.NombreClub;
        configuracion.Cuit = request.Cuit;
        configuracion.Direccion = request.Direccion;
        configuracion.Telefono = request.Telefono;
        configuracion.EmailContacto = request.EmailContacto;
        configuracion.HorariosFuncionamiento = request.HorariosFuncionamiento;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapearAResponse(configuracion));
    }

    /// <summary>
    /// Datos institucionales del club (SPEC.md §5, Etapa 6), sin autenticar — para el Portal
    /// Público y el formulario de Solicitud de Membresía. Nunca expone el resto de la
    /// Configuración General (RN-FIN-02/RN-ACC-02 son reglas internas, no datos públicos).
    /// </summary>
    [HttpGet("/api/configuracion/publica")]
    [AllowAnonymous]
    public async Task<ActionResult<ConfiguracionPublicaResponse>> ObtenerPublica(CancellationToken cancellationToken)
    {
        var configuracion = await ObtenerOCrearAsync(cancellationToken);
        return Ok(new ConfiguracionPublicaResponse(
            configuracion.NombreClub,
            configuracion.Cuit,
            configuracion.Direccion,
            configuracion.Telefono,
            configuracion.EmailContacto,
            configuracion.HorariosFuncionamiento));
    }

    /// <summary>
    /// DbSeeder ya siembra la fila singleton de forma idempotente; este fallback solo cubre
    /// una base de datos que corrió sin seed (ej. tests) — nunca debería crear una segunda fila.
    /// </summary>
    private async Task<ConfiguracionGeneral> ObtenerOCrearAsync(CancellationToken cancellationToken)
    {
        var configuracion = await _dbContext.ConfiguracionesGenerales.FirstOrDefaultAsync(cancellationToken);
        if (configuracion is not null)
        {
            return configuracion;
        }

        configuracion = new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales,
            ToleranciaAccesoDiasCuotaVencida = 10
        };

        _dbContext.ConfiguracionesGenerales.Add(configuracion);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return configuracion;
    }

    private static ConfiguracionGeneralResponse MapearAResponse(ConfiguracionGeneral c) => new(
        c.MaximaDeudaEnMeses,
        c.TipoTarifaFamiliar.ToString(),
        c.TarifaPlanaGrupoImporte,
        c.ToleranciaAccesoDiasCuotaVencida,
        c.NombreClub,
        c.Cuit,
        c.Direccion,
        c.Telefono,
        c.EmailContacto,
        c.HorariosFuncionamiento);
}
