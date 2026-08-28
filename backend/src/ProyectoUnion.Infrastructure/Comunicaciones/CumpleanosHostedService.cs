using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Job de cumpleaños (RF-COM-24, SPEC.md §6 Etapa 4). Intervalo configurable vía
/// "Cumpleanos:IntervaloHoras" (default 24), mismo patrón que
/// <c>MoraSuspensionHostedService</c> (Etapa 3).
/// </summary>
public class CumpleanosHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CumpleanosHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public CumpleanosHostedService(
        IServiceProvider serviceProvider,
        ILogger<CumpleanosHostedService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var horas = configuration.GetValue<double?>("Cumpleanos:IntervaloHoras") ?? 24;
        _intervalo = TimeSpan.FromHours(horas <= 0 ? 24 : horas);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var servicio = scope.ServiceProvider.GetRequiredService<ICumpleanosService>();
                var notificados = await servicio.ProcesarCumpleanosDelDiaAsync(stoppingToken);

                if (notificados > 0)
                {
                    _logger.LogInformation("Job de cumpleaños (RF-COM-24): {Cantidad} socio(s) notificado(s).", notificados);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error al procesar el job de cumpleaños (RF-COM-24).");
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
