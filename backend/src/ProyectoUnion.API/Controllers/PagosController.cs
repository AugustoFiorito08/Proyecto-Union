using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Registro y consulta de Pagos (SPEC.md §5 "Finanzas", RF-FIN-34, RN-FIN-05/06/07/09,
/// §3.8/§3.15/§3.16/§3.20), más checkout y webhook de Mercado Pago (enunciado Etapa 3,
/// puntos 3-4). El registro manual (<see cref="Crear"/>) y el checkout comparten la misma
/// forma de body y la misma lógica de autorización: staff con permiso "pagos.crear", o un
/// Socio autenticado pagando sus propias Cuotas/Reserva (RN-FIN-06) — nunca el origen
/// ConceptoIngresoLibre, exclusivo de staff.
/// </summary>
[ApiController]
[Route("api/pagos")]
[Authorize]
public class PagosController : ControllerBase
{
    private static readonly JsonSerializerOptions WebhookJsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly ApplicationDbContext _dbContext;
    private readonly IPagoService _pagoService;
    private readonly IMercadoPagoClient _mercadoPagoClient;
    private readonly IComprobantePdfGenerator _comprobantePdfGenerator;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PagosController> _logger;

    public PagosController(
        ApplicationDbContext dbContext,
        IPagoService pagoService,
        IMercadoPagoClient mercadoPagoClient,
        IComprobantePdfGenerator comprobantePdfGenerator,
        IConfiguration configuration,
        ILogger<PagosController> logger)
    {
        _dbContext = dbContext;
        _pagoService = pagoService;
        _mercadoPagoClient = mercadoPagoClient;
        _comprobantePdfGenerator = comprobantePdfGenerator;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "pagos.leer")]
    public async Task<ActionResult<PagedResult<PagoResponse>>> Listar(
        [FromQuery] Guid? socioId,
        [FromQuery] Guid? cuotaId,
        [FromQuery] Guid? reservaId,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = PagosConIncludes();

        if (socioId.HasValue)
        {
            query = query.Where(p => p.SocioId == socioId.Value);
        }

        if (cuotaId.HasValue)
        {
            query = query.Where(p => p.CuotaId == cuotaId.Value);
        }

        if (reservaId.HasValue)
        {
            query = query.Where(p => p.ReservaId == reservaId.Value);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoPago)estado.Value;
            query = query.Where(p => p.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var pagos = await query
            .OrderByDescending(p => p.Fecha)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<PagoResponse>(pagos.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<PagoResponse>>> Crear([FromBody] CrearPagoRequest request, CancellationToken cancellationToken)
    {
        Socio? socioActual = null;
        if (!TienePermiso("pagos.crear"))
        {
            socioActual = await ResolverSocioActualAsync(cancellationToken);
            if (socioActual is null)
            {
                return Forbid();
            }
        }

        var resultado = await _pagoService.CrearPagosAsync(request, socioActual, confirmarInmediatamente: true, cancellationToken);
        return await MapearResultadoAsync(resultado, cancellationToken);
    }

    [HttpGet("{id:guid}/comprobante")]
    [Authorize]
    public async Task<IActionResult> Comprobante(Guid id, CancellationToken cancellationToken)
    {
        var pago = await PagosConIncludes().FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (pago is null)
        {
            return NotFound();
        }

        if (!TienePermiso("pagos.leer"))
        {
            var socio = await ResolverSocioActualAsync(cancellationToken);
            if (socio is null || pago.SocioId != socio.Id)
            {
                return Forbid();
            }
        }

        var pdf = _comprobantePdfGenerator.GenerarComprobantePdf(pago);
        return File(pdf, "application/pdf", $"comprobante-{pago.Id}.pdf");
    }

    /// <summary>
    /// Crea la Preference de checkout de Mercado Pago (enunciado Etapa 3, punto 4). Recibe la
    /// misma forma de body que <see cref="Crear"/>; el/los Pago quedan Estado=Pendiente hasta
    /// que <see cref="Webhook"/> confirme el pago real.
    /// </summary>
    [HttpPost("mercadopago/checkout")]
    [Authorize]
    public async Task<ActionResult<MercadoPagoCheckoutResponse>> Checkout([FromBody] CrearPagoRequest request, CancellationToken cancellationToken)
    {
        if (!_mercadoPagoClient.EstaConfigurado)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Mercado Pago no está configurado en este entorno." });
        }

        Socio? socioActual = null;
        if (!TienePermiso("pagos.crear"))
        {
            socioActual = await ResolverSocioActualAsync(cancellationToken);
            if (socioActual is null)
            {
                return Forbid();
            }
        }

        var requestMercadoPago = request with { MedioPago = (int)MedioPago.MercadoPago };
        var resultado = await _pagoService.CrearPagosAsync(requestMercadoPago, socioActual, confirmarInmediatamente: false, cancellationToken);

        if (resultado.Estado != ResultadoPagoEstado.Ok)
        {
            switch (resultado.Estado)
            {
                case ResultadoPagoEstado.Invalido:
                    return BadRequest(new { message = resultado.Mensaje });
                case ResultadoPagoEstado.NoEncontrado:
                    return NotFound(new { message = resultado.Mensaje });
                case ResultadoPagoEstado.Prohibido:
                    return Forbid();
                case ResultadoPagoEstado.Conflicto:
                    return Conflict(new { message = resultado.Mensaje });
                default:
                    return BadRequest();
            }
        }

        var importeTotal = await _dbContext.Pagos
            .Where(p => resultado.PagoIds.Contains(p.Id))
            .SumAsync(p => p.Importe, cancellationToken);

        // external_reference (RN-FIN-07, SPEC.md §3.16): los N Pago de un "pagar todo" viajan
        // juntos en una única Preference; el webhook los resuelve a todos por esta referencia.
        var referenciaExterna = string.Join(',', resultado.PagoIds);

        string checkoutUrl;
        try
        {
            checkoutUrl = await _mercadoPagoClient.CrearPreferenciaDeCheckoutAsync(
                "Club Atlético Unión", importeTotal, referenciaExterna, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }

        return Ok(new MercadoPagoCheckoutResponse(checkoutUrl, resultado.PagoIds));
    }

    /// <summary>
    /// Notificación de Mercado Pago para el evento "payment" (enunciado Etapa 3, punto 4).
    /// Si Mercado Pago está configurado (<see cref="IMercadoPagoClient.EstaConfigurado"/>, basado
    /// en "MercadoPago:AccessToken"), exige y valida la firma oficial (header x-signature) contra
    /// "MercadoPago:WebhookSecret" — 500 si el secreto falta (hardening OWASP Top 10, Etapa 7: antes
    /// el gate de firma dependía solo de si WebhookSecret estaba seteado, permitiendo procesar
    /// pagos sin validar firma si quedaba vacío en producción). Luego resuelve el pago real contra
    /// la API de MP (para obtener su estado y el external_reference con los Guid de Pago propios)
    /// y cascadea a Cuota/Reserva. Siempre responde 200 salvo firma inválida o configuración
    /// incompleta — MP reintenta agresivamente ante cualquier otro código, y el caso de evento no
    /// relevante o MP no configurado no amerita reintento.
    /// </summary>
    [HttpPost("mercadopago/webhook")]
    [AllowAnonymous]
    [EnableRateLimiting("webhook-mp")]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        Request.EnableBuffering();
        string body;
        using (var reader = new StreamReader(Request.Body, leaveOpen: true))
        {
            body = await reader.ReadToEndAsync(cancellationToken);
        }
        Request.Body.Position = 0;

        MercadoPagoWebhookNotification? notificacion;
        try
        {
            notificacion = JsonSerializer.Deserialize<MercadoPagoWebhookNotification>(body, WebhookJsonOptions);
        }
        catch (JsonException)
        {
            return BadRequest(new { message = "Payload de webhook inválido." });
        }

        if (notificacion is null || !string.Equals(notificacion.Type, "payment", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(notificacion.Data?.Id))
        {
            return Ok(); // Otros tipos de evento no nos interesan (RF-FIN, Etapa 3).
        }

        if (!_mercadoPagoClient.EstaConfigurado)
        {
            _logger.LogWarning("Se recibió un webhook de Mercado Pago pero MercadoPago:AccessToken no está configurado en este entorno.");
            return Ok();
        }

        // El gate de firma debe depender del mismo "MP configurado" que EstaConfigurado (chequeado
        // arriba, basado en AccessToken) — no de si WebhookSecret está seteado por separado. Si
        // AccessToken está configurado mientras WebhookSecret quedó vacío, procesar el webhook sin
        // validar firma sería aceptar pagos no autenticados (bug de seguridad real detectado en
        // hardening OWASP Top 10, Etapa 7).
        var secreto = _configuration["MercadoPago:WebhookSecret"];
        if (string.IsNullOrWhiteSpace(secreto))
        {
            _logger.LogError("Mercado Pago está configurado (AccessToken presente) pero MercadoPago:WebhookSecret está vacío; no se puede validar la firma del webhook.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Configuración de Mercado Pago incompleta." });
        }

        var xSignature = Request.Headers["x-signature"].ToString();
        var xRequestId = Request.Headers["x-request-id"].ToString();

        if (!MercadoPagoSignatureValidator.Validar(xSignature, xRequestId, notificacion.Data.Id, secreto))
        {
            _logger.LogWarning("Webhook de Mercado Pago con firma inválida (data.id={DataId}).", notificacion.Data.Id);
            return Unauthorized(new { message = "Firma de webhook inválida." });
        }

        var (status, externalReference) = await _mercadoPagoClient.ObtenerPagoAsync(notificacion.Data.Id, cancellationToken);
        if (string.IsNullOrWhiteSpace(externalReference))
        {
            return Ok();
        }

        var pagoIds = externalReference.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Where(s => Guid.TryParse(s, out _))
            .Select(Guid.Parse);

        foreach (var pagoId in pagoIds)
        {
            if (string.Equals(status, "approved", StringComparison.OrdinalIgnoreCase))
            {
                await _pagoService.ConfirmarPagoAsync(pagoId, notificacion.Data.Id, cancellationToken);
            }
            else if (status is "rejected" or "cancelled")
            {
                await _pagoService.RechazarPagoAsync(pagoId, cancellationToken);
            }
        }

        return Ok();
    }

    private async Task<ActionResult<IReadOnlyList<PagoResponse>>> MapearResultadoAsync(ResultadoPago resultado, CancellationToken cancellationToken)
    {
        switch (resultado.Estado)
        {
            case ResultadoPagoEstado.Invalido:
                return BadRequest(new { message = resultado.Mensaje });
            case ResultadoPagoEstado.NoEncontrado:
                return NotFound(new { message = resultado.Mensaje });
            case ResultadoPagoEstado.Prohibido:
                return Forbid();
            case ResultadoPagoEstado.Conflicto:
                return Conflict(new { message = resultado.Mensaje });
        }

        var pagos = await PagosConIncludes().Where(p => resultado.PagoIds.Contains(p.Id)).ToListAsync(cancellationToken);
        return Ok(pagos.Select(MapearAResponse).ToList());
    }

    private bool TienePermiso(string codigo) =>
        User.Claims.Any(c => c.Type == ProyectoUnionClaimTypes.Permiso &&
                              string.Equals(c.Value, codigo, StringComparison.OrdinalIgnoreCase));

    private async Task<Socio?> ResolverSocioActualAsync(CancellationToken cancellationToken)
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (usuarioId is null || !Guid.TryParse(usuarioId, out var usuarioGuid))
        {
            return null;
        }

        return await _dbContext.Socios.FirstOrDefaultAsync(s => s.UsuarioId == usuarioGuid, cancellationToken);
    }

    private IQueryable<Pago> PagosConIncludes() =>
        _dbContext.Pagos
            .AsNoTracking()
            .Include(p => p.Socio)
            .Include(p => p.Cuota)
            .Include(p => p.Reserva).ThenInclude(r => r!.Espacio)
            .Include(p => p.ConceptoIngresoLibre);

    private static PagoResponse MapearAResponse(Pago p) => new(
        p.Id,
        p.SocioId,
        p.Socio is not null ? $"{p.Socio.Apellido}, {p.Socio.Nombres}" : null,
        p.CuotaId,
        p.Cuota?.Periodo,
        p.ReservaId,
        p.Reserva?.Espacio?.Nombre,
        p.ConceptoIngresoLibreId,
        p.ConceptoIngresoLibre?.Nombre,
        p.Concepto,
        p.Fecha,
        p.Importe,
        p.MedioPago.ToString(),
        p.Estado.ToString(),
        p.MercadoPagoTransaccionId,
        p.ComprobanteUrl);
}
