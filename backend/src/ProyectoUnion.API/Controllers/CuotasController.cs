using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Cuotas;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// Generación batch y consulta de Cuotas (SPEC.md §5 "POST /api/cuotas/generar-periodo",
/// "GET /api/cuotas", "GET /api/cuotas/{id}/detalle", §4.2 "Cuota"/"CuotaDetalle", RN-FIN-08
/// §3.18, RN-FIN-03 §3.5, RN-FIN-04 §3.6). El total mensual de un Socio surge de una única
/// Cuota consolidada (societaria + actividades) — no hay un registro cobrable independiente
/// por actividad.
/// </summary>
[ApiController]
[Route("api/cuotas")]
[Authorize]
public class CuotasController : ControllerBase
{
    private static readonly Regex PeriodoRegex = new(@"^\d{4}-(0[1-9]|1[0-2])$", RegexOptions.Compiled);

    private readonly ApplicationDbContext _dbContext;

    public CuotasController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpPost("generar-periodo")]
    [Authorize(Policy = "cuotas.generar")]
    public async Task<ActionResult<GenerarPeriodoResponse>> GenerarPeriodo(
        [FromBody] GenerarPeriodoRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Periodo) || !PeriodoRegex.IsMatch(request.Periodo))
        {
            return BadRequest(new { message = "Periodo debe tener el formato \"yyyy-MM\" (ej. \"2026-08\")." });
        }

        var periodoInicio = DateTime.SpecifyKind(
            DateTime.ParseExact(request.Periodo, "yyyy-MM", CultureInfo.InvariantCulture),
            DateTimeKind.Utc);

        var configuracion = await _dbContext.ConfiguracionesGenerales.AsNoTracking().FirstOrDefaultAsync(cancellationToken)
            ?? new ConfiguracionGeneral { TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales };

        // Idempotencia (enunciado Etapa 3, punto 2): no duplica una Cuota ya generada para el
        // mismo Socio/GrupoFamiliar + Periodo (también protegido por índice único filtrado,
        // ver CuotaConfiguration).
        var socioIdsConCuota = (await _dbContext.Cuotas
            .Where(c => c.Periodo == request.Periodo && c.SocioId != null)
            .Select(c => c.SocioId!.Value)
            .ToListAsync(cancellationToken))
            .ToHashSet();

        var grupoIdsConCuota = (await _dbContext.Cuotas
            .Where(c => c.Periodo == request.Periodo && c.GrupoFamiliarId != null)
            .Select(c => c.GrupoFamiliarId!.Value)
            .ToListAsync(cancellationToken))
            .ToHashSet();

        var numeroCuotaSiguiente = await _dbContext.Cuotas.CountAsync(cancellationToken) + 1;

        var inscripcionesPorSocio = (await _dbContext.Inscripciones
                .Include(i => i.Actividad)
                .Where(i => i.Estado == EstadoInscripcion.Activa)
                .ToListAsync(cancellationToken))
            .GroupBy(i => i.SocioId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var generadas = 0;
        var yaExistian = 0;

        // ---- Socios individuales (Activo, sin GrupoFamiliarId) ----
        var sociosIndividuales = await _dbContext.Socios
            .Include(s => s.Categoria)
            .Where(s => s.Estado == EstadoSocio.Activo && s.GrupoFamiliarId == null)
            .ToListAsync(cancellationToken);

        foreach (var socio in sociosIndividuales)
        {
            if (socioIdsConCuota.Contains(socio.Id))
            {
                yaExistian++;
                continue;
            }

            var detalles = new List<CuotaDetalle>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Concepto = "Cuota societaria",
                    ActividadId = null,
                    SocioId = socio.Id,
                    Importe = socio.Categoria.ValorCuota
                }
            };

            foreach (var inscripcion in inscripcionesPorSocio.GetValueOrDefault(socio.Id, []))
            {
                detalles.Add(new CuotaDetalle
                {
                    Id = Guid.NewGuid(),
                    Concepto = $"Actividad: {inscripcion.Actividad.Nombre}",
                    ActividadId = inscripcion.ActividadId,
                    SocioId = socio.Id,
                    Importe = inscripcion.Actividad.Precio ?? 0m
                });
            }

            var cuota = new Cuota
            {
                Id = Guid.NewGuid(),
                SocioId = socio.Id,
                GrupoFamiliarId = null,
                NumeroCuota = numeroCuotaSiguiente++,
                Periodo = request.Periodo,
                FechaVencimiento = CalcularFechaVencimiento(periodoInicio, socio.TipoPago),
                Importe = detalles.Sum(d => d.Importe),
                Estado = EstadoCuota.Pendiente,
                Detalles = detalles
            };

            _dbContext.Cuotas.Add(cuota);
            generadas++;
        }

        // ---- Grupos familiares Activos ----
        var gruposFamiliares = await _dbContext.GruposFamiliares
            .Include(g => g.TitularSocio)
            .Include(g => g.Integrantes).ThenInclude(i => i.Categoria)
            .Where(g => g.Estado == EstadoGrupoFamiliar.Activo)
            .ToListAsync(cancellationToken);

        foreach (var grupo in gruposFamiliares)
        {
            if (grupoIdsConCuota.Contains(grupo.Id))
            {
                yaExistian++;
                continue;
            }

            var integrantesActivos = grupo.Integrantes.Where(i => i.Estado == EstadoSocio.Activo).ToList();
            var detalles = new List<CuotaDetalle>();

            // Componente societario (RN-FIN-03, SPEC.md §3.5).
            if (configuracion.TipoTarifaFamiliar == TipoTarifaFamiliar.TarifaPlanaGrupo)
            {
                detalles.Add(new CuotaDetalle
                {
                    Id = Guid.NewGuid(),
                    Concepto = "Cuota societaria (grupo familiar)",
                    ActividadId = null,
                    SocioId = null,
                    Importe = configuracion.TarifaPlanaGrupoImporte ?? 0m
                });
            }
            else
            {
                foreach (var integrante in integrantesActivos)
                {
                    detalles.Add(new CuotaDetalle
                    {
                        Id = Guid.NewGuid(),
                        Concepto = $"Cuota societaria — {integrante.Apellido}, {integrante.Nombres}",
                        ActividadId = null,
                        SocioId = integrante.Id,
                        Importe = integrante.Categoria.ValorCuota
                    });
                }
            }

            // Actividades de cualquier integrante activo (RN-FIN-08, SPEC.md §3.18).
            foreach (var integrante in integrantesActivos)
            {
                foreach (var inscripcion in inscripcionesPorSocio.GetValueOrDefault(integrante.Id, []))
                {
                    detalles.Add(new CuotaDetalle
                    {
                        Id = Guid.NewGuid(),
                        Concepto = $"Actividad: {inscripcion.Actividad.Nombre} ({integrante.Apellido}, {integrante.Nombres})",
                        ActividadId = inscripcion.ActividadId,
                        SocioId = integrante.Id,
                        Importe = inscripcion.Actividad.Precio ?? 0m
                    });
                }
            }

            var tipoPagoTitular = grupo.TitularSocio.TipoPago;

            var cuota = new Cuota
            {
                Id = Guid.NewGuid(),
                SocioId = null,
                GrupoFamiliarId = grupo.Id,
                NumeroCuota = numeroCuotaSiguiente++,
                Periodo = request.Periodo,
                FechaVencimiento = CalcularFechaVencimiento(periodoInicio, tipoPagoTitular),
                Importe = detalles.Sum(d => d.Importe),
                Estado = EstadoCuota.Pendiente,
                Detalles = detalles
            };

            _dbContext.Cuotas.Add(cuota);
            generadas++;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new GenerarPeriodoResponse(generadas, yaExistian));
    }

    [HttpGet]
    [Authorize(Policy = "cuotas.leer")]
    public async Task<ActionResult<PagedResult<CuotaResponse>>> Listar(
        [FromQuery] Guid? socioId,
        [FromQuery] Guid? grupoFamiliarId,
        [FromQuery] int? estado,
        [FromQuery] string? periodo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = _dbContext.Cuotas
            .AsNoTracking()
            .Include(c => c.Socio)
            .Include(c => c.GrupoFamiliar)
            .AsQueryable();

        if (socioId.HasValue)
        {
            query = query.Where(c => c.SocioId == socioId.Value);
        }

        if (grupoFamiliarId.HasValue)
        {
            query = query.Where(c => c.GrupoFamiliarId == grupoFamiliarId.Value);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoCuota)estado.Value;
            query = query.Where(c => c.Estado == estadoFiltro);
        }

        if (!string.IsNullOrWhiteSpace(periodo))
        {
            query = query.Where(c => c.Periodo == periodo);
        }

        var total = await query.CountAsync(cancellationToken);

        var cuotas = await query
            .OrderByDescending(c => c.Periodo).ThenBy(c => c.NumeroCuota)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<CuotaResponse>(cuotas.Select(MapearAResponse).ToList(), page, pageSize, total));
    }

    [HttpGet("{id:guid}/detalle")]
    [Authorize(Policy = "cuotas.leer")]
    public async Task<ActionResult<CuotaConDetalleResponse>> Detalle(Guid id, CancellationToken cancellationToken)
    {
        var cuota = await _dbContext.Cuotas
            .AsNoTracking()
            .Include(c => c.Socio)
            .Include(c => c.GrupoFamiliar)
            .Include(c => c.Detalles).ThenInclude(d => d.Actividad)
            .Include(c => c.Detalles).ThenInclude(d => d.Socio)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (cuota is null)
        {
            return NotFound();
        }

        var detalles = cuota.Detalles
            .Select(d => new CuotaDetalleResponse(
                d.Id,
                d.Concepto,
                d.ActividadId,
                d.Actividad?.Nombre,
                d.SocioId,
                d.Socio is not null ? $"{d.Socio.Apellido}, {d.Socio.Nombres}" : null,
                d.Importe))
            .ToList();

        return Ok(new CuotaConDetalleResponse(MapearAResponse(cuota), detalles));
    }

    /// <summary>
    /// Decisión de implementación (no especificada literalmente en SPEC.md): mensual=+1 mes,
    /// semestral=+6 meses, anual=+12 meses, estudiante=+1 mes desde el inicio del Periodo
    /// (enunciado Etapa 3, punto 2).
    /// </summary>
    private static DateTime CalcularFechaVencimiento(DateTime periodoInicio, TipoPago tipoPago) => tipoPago switch
    {
        TipoPago.Mensual => periodoInicio.AddMonths(1),
        TipoPago.Semestral => periodoInicio.AddMonths(6),
        TipoPago.Anual => periodoInicio.AddMonths(12),
        TipoPago.Estudiante => periodoInicio.AddMonths(1),
        _ => periodoInicio.AddMonths(1)
    };

    private static CuotaResponse MapearAResponse(Cuota c) => new(
        c.Id,
        c.SocioId,
        c.Socio is not null ? $"{c.Socio.Apellido}, {c.Socio.Nombres}" : null,
        c.GrupoFamiliarId,
        c.GrupoFamiliar?.Nombre,
        c.NumeroCuota,
        c.Periodo,
        c.FechaVencimiento,
        c.Importe,
        c.RecargoMora,
        c.Estado.ToString());
}
