using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Job de envío diferido de Comunicaciones (SPEC.md §4.2 "Comunicacion.FechaProgramada",
/// NUEVO-SPEC-UI; ver doc-comment de <see cref="IComunicacionService.ProgramarAsync"/>).
/// Busca, cada "ComunicacionProgramada:IntervaloMinutos" (default 5 — más frecuente que los
/// jobs diarios porque una comunicación programada suele tener una hora de envío específica),
/// las Comunicacion en Estado=Programada con FechaProgramada &lt;= UtcNow y dispara
/// <see cref="IComunicacionService.EnviarAsync"/> para cada una.
/// </summary>
public class ComunicacionProgramadaHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ComunicacionProgramadaHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public ComunicacionProgramadaHostedService(
        IServiceProvider serviceProvider,
        ILogger<ComunicacionProgramadaHostedService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var minutos = configuration.GetValue<double?>("ComunicacionProgramada:IntervaloMinutos") ?? 5;
        _intervalo = TimeSpan.FromMinutes(minutos <= 0 ? 5 : minutos);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var comunicacionService = scope.ServiceProvider.GetRequiredService<IComunicacionService>();

                var ahora = DateTime.UtcNow;
                var idsAEnviar = await dbContext.Comunicaciones
                    .AsNoTracking()
                    .Where(c => c.Estado == EstadoComunicacion.Programada && c.FechaProgramada != null && c.FechaProgramada <= ahora)
                    .Select(c => c.Id)
                    .ToListAsync(stoppingToken);

                foreach (var id in idsAEnviar)
                {
                    await comunicacionService.EnviarAsync(id, stoppingToken);
                }

                if (idsAEnviar.Count > 0)
                {
                    _logger.LogInformation("Job de comunicaciones programadas: {Cantidad} comunicación(es) enviada(s).", idsAEnviar.Count);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error al procesar comunicaciones programadas.");
            }

            try
            {
                await Task.Delay(_intervalo, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }
}
