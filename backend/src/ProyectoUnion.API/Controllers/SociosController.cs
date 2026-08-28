using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Socios;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Socios (SPEC.md §5 "Socios", §4.2 "Socio"). Incluye ficha médica con vencimiento
/// (RF-SOC-04 ter/quater), baja lógica con motivo trazable y reactivación (RN-SOC-01),
/// generación del identificador opaco de QR (RN-ACC-05) y del Carnet Digital en PDF.
/// </summary>
[ApiController]
[Route("api/socios")]
[Authorize]
public class SociosController : ControllerBase
{
    private const string RolSocio = "Socio";

    private readonly ApplicationDbContext _dbContext;
    private readonly IQrCodeGenerator _qrCodeGenerator;
    private readonly ICarnetPdfGenerator _carnetPdfGenerator;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<SociosController> _logger;

    public SociosController(
        ApplicationDbContext dbContext,
        IQrCodeGenerator qrCodeGenerator,
        ICarnetPdfGenerator carnetPdfGenerator,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IEmailSender emailSender,
        ILogger<SociosController> logger)
    {
        _dbContext = dbContext;
        _qrCodeGenerator = qrCodeGenerator;
        _carnetPdfGenerator = carnetPdfGenerator;
        _userManager = userManager;
        _roleManager = roleManager;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "socios.leer")]
    public async Task<ActionResult<PagedResult<SocioResponse>>> Listar(
        [FromQuery] string? nombre,
        [FromQuery] string? dni,
        [FromQuery] Guid? categoriaId,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = _dbContext.Socios
            .AsNoTracking()
            .Include(s => s.Categoria)
            .Include(s => s.CoberturaMedica)
            .Include(s => s.Plan)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var texto = nombre.Trim();
            query = query.Where(s => s.Apellido.Contains(texto) || s.Nombres.Contains(texto));
        }

        if (!string.IsNullOrWhiteSpace(dni))
        {
            query = query.Where(s => s.DNI.Contains(dni.Trim()));
        }

        if (categoriaId.HasValue)
        {
            query = query.Where(s => s.CategoriaId == categoriaId.Value);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoSocio)estado.Value;
            query = query.Where(s => s.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var socios = await query
            .OrderBy(s => s.Apellido).ThenBy(s => s.Nombres)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = socios.Select(MapearAResponse).ToList();


        return Ok(new PagedResult<SocioResponse>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "socios.leer")]
    public async Task<ActionResult<SocioResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var socio = await ObtenerSocioConIncludes(id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(socio));
    }

    [HttpPost]
    [Authorize(Policy = "socios.crear")]
    public async Task<ActionResult<SocioResponse>> Crear([FromBody] CrearSocioRequest request, CancellationToken cancellationToken)
    {
        if (await _dbContext.Socios.AnyAsync(s => s.DNI == request.DNI, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe un socio con ese DNI." });
        }

        if (await _dbContext.Socios.AnyAsync(s => s.Email == request.Email, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe un socio con ese email." });
        }

        if (!await _dbContext.Categorias.AnyAsync(c => c.Id == request.CategoriaId, cancellationToken))
        {
            return BadRequest(new { message = "La categoría indicada no existe." });
        }

        if (request.CoberturaMedicaId.HasValue &&
            !await _dbContext.CoberturasMedicas.AnyAsync(c => c.Id == request.CoberturaMedicaId.Value, cancellationToken))
        {
            return BadRequest(new { message = "La cobertura médica indicada no existe." });
        }

        if (request.PlanId.HasValue &&
            !await _dbContext.Planes.AnyAsync(p => p.Id == request.PlanId.Value, cancellationToken))
        {
            return BadRequest(new { message = "El plan indicado no existe." });
        }

        var socio = new Socio
        {
            Id = Guid.NewGuid(),
            NumeroSocio = await GenerarNumeroSocioAsync(cancellationToken),
            Apellido = request.Apellido,
            Nombres = request.Nombres,
            DNI = request.DNI,
            CUIL = request.CUIL,
            FechaNacimiento = AsUtc(request.FechaNacimiento),
            Genero = request.Genero,
            Nacionalidad = request.Nacionalidad,
            TipoPago = (TipoPago)request.TipoPago,
            CategoriaId = request.CategoriaId,
            Telefono = request.Telefono,
            Celular = request.Celular,
            Email = request.Email,
            Domicilio = request.Domicilio,
            Localidad = request.Localidad,
            Provincia = request.Provincia,
            CodigoPostal = request.CodigoPostal,
            CoberturaMedicaId = request.CoberturaMedicaId,
            PlanId = request.PlanId,
            GrupoSanguineo = request.GrupoSanguineo,
            ContactoEmergencia = request.ContactoEmergencia,
            ObservacionesMedicas = request.ObservacionesMedicas,
            FichaMedicaFechaEmision = AsUtc(request.FichaMedicaFechaEmision),
            FichaMedicaFechaVencimiento = CalcularVencimientoFichaMedica(AsUtc(request.FichaMedicaFechaEmision)),
            FotoUrl = request.FotoUrl,
            Modalidad = (ModalidadSocio)request.Modalidad,
            Estado = EstadoSocio.Activo,
            FechaAlta = DateTime.UtcNow,
            FechaUltimaModificacion = DateTime.UtcNow,
            CodigoQr = await GenerarCodigoQrUnicoAsync(cancellationToken),
            ConsentimientoDatosSaludFecha = request.ConsentimientoDatosSalud ? DateTime.UtcNow : null
        };

        _dbContext.Socios.Add(socio);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var socioCreado = await ObtenerSocioConIncludes(socio.Id, cancellationToken);
        var response = MapearAResponse(socioCreado!);
        return CreatedAtAction(nameof(Obtener), new { id = socio.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "socios.editar")]
    public async Task<ActionResult<SocioResponse>> Actualizar(Guid id, [FromBody] ActualizarSocioRequest request, CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        if (await _dbContext.Socios.AnyAsync(s => s.Email == request.Email && s.Id != id, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe otro socio con ese email." });
        }

        if (!await _dbContext.Categorias.AnyAsync(c => c.Id == request.CategoriaId, cancellationToken))
        {
            return BadRequest(new { message = "La categoría indicada no existe." });
        }

        if (request.CoberturaMedicaId.HasValue &&
            !await _dbContext.CoberturasMedicas.AnyAsync(c => c.Id == request.CoberturaMedicaId.Value, cancellationToken))
        {
            return BadRequest(new { message = "La cobertura médica indicada no existe." });
        }

        if (request.PlanId.HasValue &&
            !await _dbContext.Planes.AnyAsync(p => p.Id == request.PlanId.Value, cancellationToken))
        {
            return BadRequest(new { message = "El plan indicado no existe." });
        }

        socio.Apellido = request.Apellido;
        socio.Nombres = request.Nombres;
        socio.CUIL = request.CUIL;
        socio.FechaNacimiento = AsUtc(request.FechaNacimiento);
        socio.Genero = request.Genero;
        socio.Nacionalidad = request.Nacionalidad;
        socio.TipoPago = (TipoPago)request.TipoPago;
        socio.CategoriaId = request.CategoriaId;
        socio.Telefono = request.Telefono;
        socio.Celular = request.Celular;
        socio.Email = request.Email;
        socio.Domicilio = request.Domicilio;
        socio.Localidad = request.Localidad;
        socio.Provincia = request.Provincia;
        socio.CodigoPostal = request.CodigoPostal;
        socio.CoberturaMedicaId = request.CoberturaMedicaId;
        socio.PlanId = request.PlanId;
        socio.GrupoSanguineo = request.GrupoSanguineo;
        socio.ContactoEmergencia = request.ContactoEmergencia;
        socio.ObservacionesMedicas = request.ObservacionesMedicas;
        socio.FichaMedicaFechaEmision = AsUtc(request.FichaMedicaFechaEmision);
        socio.FichaMedicaFechaVencimiento = CalcularVencimientoFichaMedica(AsUtc(request.FichaMedicaFechaEmision));
        socio.FotoUrl = request.FotoUrl;
        socio.Modalidad = (ModalidadSocio)request.Modalidad;
        socio.FechaUltimaModificacion = DateTime.UtcNow;

        // No revoca retroactivamente un consentimiento ya otorgado (RN-SEG-01); solo lo
        // registra si todavía no existía.
        if (request.ConsentimientoDatosSalud && socio.ConsentimientoDatosSaludFecha is null)
        {
            socio.ConsentimientoDatosSaludFecha = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var socioActualizado = await ObtenerSocioConIncludes(id, cancellationToken);
        return Ok(MapearAResponse(socioActualizado!));
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "socios.baja")]
    public async Task<IActionResult> Baja(Guid id, [FromBody] BajaSocioRequest request, CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        // RN-GF-01 (SPEC.md §3.4): no se puede dar de baja al titular de un grupo familiar
        // activo sin antes reasignar la titularidad o dar de baja el grupo completo.
        var esTitularDeGrupoActivo = await _dbContext.GruposFamiliares
            .AnyAsync(g => g.TitularSocioId == id && g.Estado == EstadoGrupoFamiliar.Activo, cancellationToken);

        if (esTitularDeGrupoActivo)
        {
            return Conflict(new
            {
                message = "El socio es titular de un grupo familiar activo. Reasigne la titularidad " +
                           "(POST /api/grupos-familiares/{id}/cambiar-titular) o dé de baja el grupo " +
                           "familiar completo antes de dar de baja al socio."
            });
        }

        socio.Estado = EstadoSocio.Inactivo;
        socio.FechaBaja = DateTime.UtcNow;
        socio.MotivoBaja = request.Motivo;
        socio.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/reactivar")]
    [Authorize(Policy = "socios.editar")]
    public async Task<IActionResult> Reactivar(Guid id, CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        if (socio.Estado == EstadoSocio.Activo)
        {
            return BadRequest(new { message = "El socio ya se encuentra activo." });
        }

        // RN-SOC-01 (SPEC.md §3.3): valida ficha médica vigente antes de reactivar. La deuda
        // histórica no se condona (queda fuera de alcance de Etapa 1, se resuelve en Finanzas).
        if (socio.FichaMedicaFechaVencimiento.HasValue && socio.FichaMedicaFechaVencimiento.Value < DateTime.UtcNow)
        {
            return Conflict(new
            {
                message = "La ficha médica del socio está vencida. Actualícela (PUT /api/socios/{id}) antes de reactivar."
            });
        }

        socio.Estado = EstadoSocio.Activo;
        socio.FechaBaja = null;
        socio.MotivoBaja = null;
        socio.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPut("{id:guid}/estado")]
    [Authorize(Policy = "socios.editar")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoSocioRequest request, CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        if (!Enum.IsDefined(typeof(EstadoSocio), request.Estado))
        {
            return BadRequest(new { message = "Estado inválido." });
        }

        socio.Estado = (EstadoSocio)request.Estado;
        socio.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("{id:guid}/carnet")]
    [Authorize(Policy = "socios.leer")]
    public async Task<IActionResult> Carnet(Guid id, CancellationToken cancellationToken)
    {
        var socio = await ObtenerSocioConIncludes(id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        // El QR codifica únicamente el identificador opaco del socio (RN-ACC-05, SPEC.md
        // §3.1) — nunca datos personales en claro.
        var qrPng = _qrCodeGenerator.GenerarPng(socio.CodigoQr);
        var pdf = _carnetPdfGenerator.GenerarCarnetPdf(socio, qrPng);

        return File(pdf, "application/pdf", $"carnet-{socio.NumeroSocio}.pdf");
    }

    /// <summary>
    /// Alta de cuenta de login del Portal del Socio (SPEC.md §5, Etapa 2). Si el Socio ya
    /// tiene <see cref="Socio.UsuarioId"/>, devuelve 400 (no reemplaza cuentas existentes).
    /// </summary>
    [HttpPost("{id:guid}/crear-acceso")]
    [Authorize(Policy = "socios.editar")]
    public async Task<ActionResult<CrearAccesoResponse>> CrearAcceso(Guid id, CancellationToken cancellationToken)
    {
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (socio is null)
        {
            return NotFound();
        }

        if (socio.UsuarioId.HasValue)
        {
            return BadRequest(new { message = "El socio ya tiene una cuenta de acceso creada." });
        }

        if (await _userManager.FindByEmailAsync(socio.Email) is not null)
        {
            return BadRequest(new { message = "Ya existe una cuenta de usuario con el email del socio." });
        }

        var rolSocio = await _roleManager.FindByNameAsync(RolSocio);
        if (rolSocio is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "El rol Socio no está sembrado en el sistema." });
        }

        var passwordTemporal = TemporaryPasswordGenerator.Generar();

        var usuario = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = socio.Email,
            Email = socio.Email,
            EmailConfirmed = true,
            RolId = rolSocio.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        var resultado = await _userManager.CreateAsync(usuario, passwordTemporal);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { errors = resultado.Errors.Select(e => e.Description) });
        }

        socio.UsuarioId = usuario.Id;
        socio.FechaUltimaModificacion = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Etapa 4: la contraseña temporal se envía por email (cerrado el TODO de Etapa 2);
        // solo viaja en la respuesta como fallback de emergencia si el envío falla (por
        // ejemplo, SMTP no configurado en este entorno), para no dejar al socio sin forma de
        // acceder a su cuenta recién creada.
        var passwordEnviadaPorEmail = await IntentarEnviarPasswordTemporalAsync(socio.Email, passwordTemporal, cancellationToken);

        return Ok(new CrearAccesoResponse(usuario.Id, passwordEnviadaPorEmail, passwordEnviadaPorEmail ? null : passwordTemporal));
    }

    /// <summary>
    /// Envía la contraseña temporal por email (Etapa 4). Devuelve false —sin propagar la
    /// excepción— si el proveedor de email no está configurado, para que el caller pueda
    /// caer al fallback de mostrarla en la respuesta.
    /// </summary>
    private async Task<bool> IntentarEnviarPasswordTemporalAsync(string email, string passwordTemporal, CancellationToken cancellationToken)
    {
        var contenido =
            $"<p>Se creó tu acceso al Portal del Socio del Club Atlético Unión.</p>" +
            $"<p>Usuario: <strong>{email}</strong><br/>Contraseña temporal: <strong>{passwordTemporal}</strong></p>" +
            $"<p>Te recomendamos cambiarla la primera vez que ingreses.</p>";

        try
        {
            await _emailSender.EnviarAsync(email, "Acceso al Portal del Socio", contenido, cancellationToken);
            return true;
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "No se pudo enviar la contraseña temporal por email (proveedor no configurado).");
            return false;
        }
    }

    private Task<Socio?> ObtenerSocioConIncludes(Guid id, CancellationToken cancellationToken) =>
        _dbContext.Socios
            .Include(s => s.Categoria)
            .Include(s => s.CoberturaMedica)
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    private static DateTime? CalcularVencimientoFichaMedica(DateTime? fechaEmision) =>
        fechaEmision?.AddYears(1);

    /// <summary>
    /// Npgsql exige `Kind=Utc` para escribir en columnas `timestamp with time zone`; las
    /// fechas que llegan deserializadas desde el JSON del request (ej. "1990-05-10") tienen
    /// `Kind=Unspecified` por default y Npgsql las rechaza en tiempo de ejecución (no es un
    /// error de compilación ni lo cubre un test sin Postgres real detrás). Estos campos son en
    /// realidad fechas de calendario sin componente horario — se normalizan a UTC acá en el
    /// borde de entrada en vez de introducir `DateOnly` en todo el modelo para Etapa 1.
    /// </summary>
    private static DateTime AsUtc(DateTime value) =>
        DateTime.SpecifyKind(value, DateTimeKind.Utc);

    private static DateTime? AsUtc(DateTime? value) =>
        value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;

    /// <summary>
    /// Decisión de implementación (no 100% especificada en SPEC.md): NumeroSocio se genera
    /// como "S" + correlativo de 6 dígitos según la cantidad actual de socios. No es
    /// estrictamente atómico bajo alta concurrencia (aceptable para el volumen de un club;
    /// se revisaría con un generador de secuencia en base de datos si hiciera falta).
    /// </summary>
    private async Task<string> GenerarNumeroSocioAsync(CancellationToken cancellationToken)
    {
        var total = await _dbContext.Socios.CountAsync(cancellationToken);
        return $"S{(total + 1):D6}";
    }

    /// <summary>
    /// Identificador opaco e inmutable del QR del carnet (RN-ACC-05, SPEC.md §3.1), generado
    /// con RandomNumberGenerator — nunca contiene datos personales.
    /// </summary>
    private async Task<string> GenerarCodigoQrUnicoAsync(CancellationToken cancellationToken)
    {
        string codigo;
        do
        {
            codigo = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
        }
        while (await _dbContext.Socios.AnyAsync(s => s.CodigoQr == codigo, cancellationToken));

        return codigo;
    }

    /// <summary>
    /// Regla transversal (SPEC.md §2.2): solo SuperAdministrador/Administrador
    /// (<c>nivel_jerarquico</c> 1 o 2) ven la ficha médica completa de un socio. El resto de
    /// los roles (Empleado, Instructor) solo ve <see cref="SocioResponse.FichaMedicaVigencia"/>.
    /// </summary>
    private bool PuedeVerFichaMedicaCompleta() =>
        int.TryParse(User.FindFirst(ProyectoUnionClaimTypes.NivelJerarquico)?.Value, out var nivel) && nivel <= 2;

    /// <summary>
    /// Semáforo de vigencia expuesto a roles sin acceso a la ficha médica completa. El umbral
    /// de 30 días para "próxima a vencer" es una decisión de implementación razonable, no
    /// especificada literalmente en el SPEC.
    /// </summary>
    private static string? CalcularVigenciaFichaMedica(DateTime? vencimiento)
    {
        if (!vencimiento.HasValue)
        {
            return null;
        }

        var diasRestantes = (vencimiento.Value.Date - DateTime.UtcNow.Date).TotalDays;
        if (diasRestantes < 0)
        {
            return "Vencida";
        }

        return diasRestantes <= 30 ? "ProximaAVencer" : "Vigente";
    }

    private SocioResponse MapearAResponse(Socio s)
    {
        var puedeVerFichaMedicaCompleta = PuedeVerFichaMedicaCompleta();
        var vigencia = CalcularVigenciaFichaMedica(s.FichaMedicaFechaVencimiento);

        return new SocioResponse(
            s.Id,
            s.NumeroSocio,
            s.Apellido,
            s.Nombres,
            s.DNI,
            s.CUIL,
            s.FechaNacimiento,
            s.Genero,
            s.Nacionalidad,
            s.TipoPago.ToString(),
            s.CategoriaId,
            s.Categoria?.Nombre ?? string.Empty,
            s.Telefono,
            s.Celular,
            s.Email,
            s.Domicilio,
            s.Localidad,
            s.Provincia,
            s.CodigoPostal,
            puedeVerFichaMedicaCompleta ? s.CoberturaMedicaId : null,
            puedeVerFichaMedicaCompleta ? s.CoberturaMedica?.Nombre : null,
            puedeVerFichaMedicaCompleta ? s.PlanId : null,
            puedeVerFichaMedicaCompleta ? s.Plan?.Nombre : null,
            puedeVerFichaMedicaCompleta ? s.GrupoSanguineo : null,
            s.ContactoEmergencia,
            puedeVerFichaMedicaCompleta ? s.ObservacionesMedicas : null,
            puedeVerFichaMedicaCompleta ? s.FichaMedicaFechaEmision : null,
            puedeVerFichaMedicaCompleta ? s.FichaMedicaFechaVencimiento : null,
            s.FotoUrl,
            s.GrupoFamiliarId,
            s.Parentesco?.ToString(),
            s.Modalidad.ToString(),
            s.Estado.ToString(),
            s.FechaAlta,
            s.FechaBaja,
            s.MotivoBaja,
            s.CodigoQr,
            s.ConsentimientoDatosSaludFecha,
            puedeVerFichaMedicaCompleta ? null : vigencia);
    }
}
