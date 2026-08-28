using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Finanzas;

/// <summary>
/// Implementación de <see cref="IMoraSuspensionService"/> (RN-FIN-02, SPEC.md §3.2). No
/// reactiva automáticamente — la reactivación es manual (RN-SOC-01, §3.3,
/// SociosController.Reactivar, ya implementado en Etapa 1). Etapa 4: al suspender, notifica
/// al socio (RF-COM-26/RN-FIN-02, cierre del gap dejado pendiente en Etapa 3 — ver SPEC.md
/// §6 nota de Etapa 3) vía <see cref="IComunicacionService.CrearYEnviarASocioAsync"/>.
/// </summary>
public class MoraSuspensionService : IMoraSuspensionService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly IComunicacionService _comunicacionService;

    public MoraSuspensionService(ApplicationDbContext dbContext, IComunicacionService comunicacionService)
    {
        _dbContext = dbContext;
        _comunicacionService = comunicacionService;
    }

    public async Task<int> ProcesarSuspensionesAsync(CancellationToken cancellationToken)
    {
        var configuracion = await _dbContext.ConfiguracionesGenerales.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        var maximaDeudaEnMeses = configuracion?.MaximaDeudaEnMeses ?? 2;
        var ahora = DateTime.UtcNow;
        var limiteAntiguedad = ahora.AddMonths(-maximaDeudaEnMeses);

        // Decisión de implementación (no especificada en SPEC.md como endpoint/job aparte):
        // la transición Pendiente→Vencida no tiene un disparador propio en el enunciado de
        // Etapa 3, así que este mismo job diario la resuelve como paso previo — RN-FIN-01/02
        // (§3.2) solo tienen sentido si Cuota.Estado llega a Vencida en algún momento.
        var cuotasQueVencenHoy = await _dbContext.Cuotas
            .Where(c => c.Estado == EstadoCuota.Pendiente && c.FechaVencimiento < ahora)
            .ToListAsync(cancellationToken);

        foreach (var cuota in cuotasQueVencenHoy)
        {
            cuota.Estado = EstadoCuota.Vencida;
        }

        if (cuotasQueVencenHoy.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // Socios individuales con al menos una Cuota Vencida cuya antigüedad supera el máximo tolerado.
        var socioIdsConMoraExcesiva = await _dbContext.Cuotas
            .Where(c => c.Estado == EstadoCuota.Vencida && c.SocioId != null && c.FechaVencimiento < limiteAntiguedad)
            .Select(c => c.SocioId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        // Cuotas familiares en la misma condición: aplica a todos los integrantes del grupo.
        var gruposConMoraExcesiva = await _dbContext.Cuotas
            .Where(c => c.Estado == EstadoCuota.Vencida && c.GrupoFamiliarId != null && c.FechaVencimiento < limiteAntiguedad)
            .Select(c => c.GrupoFamiliarId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (gruposConMoraExcesiva.Count > 0)
        {
            var integrantesIds = await _dbContext.Socios
                .Where(s => s.GrupoFamiliarId != null && gruposConMoraExcesiva.Contains(s.GrupoFamiliarId!.Value))
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);

            socioIdsConMoraExcesiva = socioIdsConMoraExcesiva.Union(integrantesIds).ToList();
        }

        if (socioIdsConMoraExcesiva.Count == 0)
        {
            return 0;
        }

        var socios = await _dbContext.Socios
            .Where(s => socioIdsConMoraExcesiva.Contains(s.Id) && s.Estado == EstadoSocio.Activo)
            .ToListAsync(cancellationToken);

        foreach (var socio in socios)
        {
            socio.Estado = EstadoSocio.Suspendido;
            socio.FechaUltimaModificacion = ahora;
        }

        if (socios.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            foreach (var socio in socios)
            {
                var contenido = "<p>Te informamos que tu membresía fue suspendida automáticamente por mora " +
                                 "(deuda superior al máximo tolerado). Para reactivarla, regularizá tu deuda y " +
                                 "contactate con Secretaría.</p>";

                await _comunicacionService.CrearYEnviarASocioAsync(
                    socio.Id,
                    "Suspensión de membresía por mora",
                    contenido,
                    TipoComunicacion.Otro,
                    [CanalComunicacion.Email, CanalComunicacion.Novedad],
                    creadoPorUsuarioId: null,
                    cancellationToken);
            }
        }

        return socios.Count;
    }
}
