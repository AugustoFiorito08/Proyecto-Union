using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.ControlAcceso;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Control de Acceso (QR) en portería (SPEC.md §5 "Control de Acceso", §3.1 RN-ACC-02/03/04,
/// Etapa 5). Uso operativo diario del Empleado de Secretaría (matriz §2.2: "CL — operar
/// portería") además de SuperAdmin/Administrador.
/// </summary>
[ApiController]
[Route("api/control-acceso")]
[Authorize]
public class ControlAccesoController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IControlAccesoService _controlAccesoService;

    public ControlAccesoController(ApplicationDbContext dbContext, IControlAccesoService controlAccesoService)
    {
        _dbContext = dbContext;
        _controlAccesoService = controlAccesoService;
    }

    [HttpPost("validar")]
    [Authorize(Policy = "control-acceso.validar")]
    public async Task<ActionResult<ValidarAccesoResponse>> Validar(
        [FromBody] ValidarAccesoRequest request, CancellationToken cancellationToken)
    {
        var operadorUsuarioId = ObtenerUsuarioIdActual();
        if (operadorUsuarioId is null)
        {
            return Unauthorized();
        }

        var resultado = await _controlAccesoService.ValidarAsync(request.CodigoQr, operadorUsuarioId.Value, cancellationToken);
        return Ok(resultado);
    }

    [HttpGet("historial")]
    [Authorize(Policy = "control-acceso.leer")]
    public async Task<ActionResult<PagedResult<RegistroAccesoResponse>>> Historial(
        [FromQuery] Guid? socioId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = _dbContext.RegistrosAcceso
            .AsNoTracking()
            .Include(r => r.Socio)
            .Include(r => r.OperadorUsuario)
            .AsQueryable();

        if (socioId.HasValue)
        {
            query = query.Where(r => r.SocioId == socioId.Value);
        }

        var total = await query.CountAsync(cancellationToken);

        var registros = await query
            .OrderByDescending(r => r.FechaHora)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = registros.Select(r => new RegistroAccesoResponse(
            r.Id,
            r.FechaHora,
            r.Resultado.ToString(),
            r.MotivoDenegacion,
            r.SocioId,
            r.Socio is null ? null : $"{r.Socio.Apellido}, {r.Socio.Nombres}",
            r.OperadorUsuarioId,
            r.OperadorUsuario.Email ?? string.Empty)).ToList();

        return Ok(new PagedResult<RegistroAccesoResponse>(items, page, pageSize, total));
    }

    private Guid? ObtenerUsuarioIdActual()
    {
        var usuarioId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(usuarioId, out var guid) ? guid : null;
    }
}
