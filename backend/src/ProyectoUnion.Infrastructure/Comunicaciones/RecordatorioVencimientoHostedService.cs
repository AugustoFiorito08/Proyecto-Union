using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Job de recordatorio de vencimiento de cuota (RF-COM-26, SPEC.md §6 Etapa 4). Intervalo
/// configurable vía "RecordatorioVencimiento:IntervaloHoras" (default 24); la anticipación en
/// días la resuelve <see cref="RecordatorioVencimientoService"/> vía
/// "RecordatorioVencimiento:DiasAnticipacion" (default 5).
/// </summary>
public class RecordatorioVencimientoHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<RecordatorioVencimientoHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public RecordatorioVencimientoHostedService(
        IServiceProvider serviceProvider,
        ILogger<RecordatorioVencimientoHostedService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var horas = configuration.GetValue<double?>("RecordatorioVencimiento:IntervaloHoras") ?? 24;
        _intervalo = TimeSpan.FromHours(horas <= 0 ? 24 : horas);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var servicio = scope.ServiceProvider.GetRequiredService<IRecordatorioVencimientoService>();
                var enviados = await servicio.ProcesarRecordatoriosAsync(stoppingToken);

                if (enviados > 0)
                {
                    _logger.LogInformation("Job de recordatorio de vencimiento (RF-COM-26): {Cantidad} recordatorio(s) enviado(s).", enviados);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error al procesar el job de recordatorio de vencimiento (RF-COM-26).");
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
