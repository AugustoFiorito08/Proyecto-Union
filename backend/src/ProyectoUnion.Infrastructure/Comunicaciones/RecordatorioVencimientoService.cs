using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Implementación de <see cref="IRecordatorioVencimientoService"/> (RF-COM-26, SPEC.md §6
/// Etapa 4). Decisión de implementación: como <c>Comunicacion</c> no tiene una FK a
/// <c>Cuota</c> (SPEC.md §4.2 no la define) y la interfaz de <c>IComunicacionService</c> no
/// admite un identificador de correlación, la deduplicación "misma Cuota" se resuelve
/// incrustando un comentario HTML invisible <c>&lt;!-- cuota:{CuotaId} --&gt;</c> al final del
/// contenido de la Comunicacion generada, y se descarta cualquier Cuota cuyo marcador ya
/// exista en una Comunicacion tipo Recordatorio previa.
/// </summary>
public class RecordatorioVencimientoService : IRecordatorioVencimientoService
{
    private static readonly CanalComunicacion[] CanalesPorDefecto = [CanalComunicacion.Email, CanalComunicacion.Novedad];

    private readonly ApplicationDbContext _dbContext;
    private readonly IComunicacionService _comunicacionService;
    private readonly IConfiguration _configuration;

    public RecordatorioVencimientoService(ApplicationDbContext dbContext, IComunicacionService comunicacionService, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _comunicacionService = comunicacionService;
        _configuration = configuration;
    }

    public async Task<int> ProcesarRecordatoriosAsync(CancellationToken cancellationToken)
    {
        var diasAnticipacion = _configuration.GetValue<int?>("RecordatorioVencimiento:DiasAnticipacion") ?? 5;
        var hoy = DateTime.UtcNow.Date;
        var limite = hoy.AddDays(diasAnticipacion <= 0 ? 5 : diasAnticipacion);

        var cuotas = await _dbContext.Cuotas
            .AsNoTracking()
            .Where(c => c.Estado == EstadoCuota.Pendiente && c.FechaVencimiento >= hoy && c.FechaVencimiento <= limite)
            .ToListAsync(cancellationToken);

        var enviados = 0;
        foreach (var cuota in cuotas)
        {
            var marcador = MarcadorDeCuota(cuota.Id);
            var yaRecordado = await _dbContext.Comunicaciones
                .AsNoTracking()
                .AnyAsync(c => c.TipoComunicacion == TipoComunicacion.Recordatorio && c.ContenidoHtml.Contains(marcador), cancellationToken);

            if (yaRecordado)
            {
                continue;
            }

            var socioId = await ResolverSocioDestinoAsync(cuota, cancellationToken);
            if (socioId is null)
            {
                continue;
            }

            var contenido = $"<p>Te recordamos que tu cuota del período {cuota.Periodo} vence el {cuota.FechaVencimiento:dd/MM/yyyy}. " +
                             $"Importe: ${cuota.Importe:N2}.</p>{marcador}";

            var comunicacion = await _comunicacionService.CrearYEnviarASocioAsync(
                socioId.Value,
                "Recordatorio de vencimiento de cuota",
                contenido,
                TipoComunicacion.Recordatorio,
                CanalesPorDefecto,
                creadoPorUsuarioId: null,
                cancellationToken);

            if (comunicacion is not null)
            {
                enviados++;
            }
        }

        return enviados;
    }

    private async Task<Guid?> ResolverSocioDestinoAsync(Cuota cuota, CancellationToken cancellationToken)
    {
        if (cuota.SocioId.HasValue)
        {
            return cuota.SocioId;
        }

        if (!cuota.GrupoFamiliarId.HasValue)
        {
            return null;
        }

        var grupo = await _dbContext.GruposFamiliares
            .AsNoTracking()
            .FirstOrDefaultAsync(g => g.Id == cuota.GrupoFamiliarId.Value, cancellationToken);

        return grupo?.TitularSocioId;
    }

    private static string MarcadorDeCuota(Guid cuotaId) => $"<!-- cuota:{cuotaId} -->";
}
