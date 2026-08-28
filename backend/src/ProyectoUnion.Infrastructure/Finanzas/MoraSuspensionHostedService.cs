using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Finanzas;

/// <summary>
/// Job diario de suspensión por mora (RN-FIN-02, SPEC.md §3.2). Intervalo configurable vía
/// "MoraSuspension:IntervaloHoras" (default 24) para poder probarlo sin esperar un día real.
/// Registrado con AddHostedService en Program.cs (enunciado Etapa 3, punto 5).
/// </summary>
public class MoraSuspensionHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MoraSuspensionHostedService> _logger;
    private readonly TimeSpan _intervalo;

    public MoraSuspensionHostedService(
        IServiceProvider serviceProvider,
        ILogger<MoraSuspensionHostedService> logger,
        IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;

        var horas = configuration.GetValue<double?>("MoraSuspension:IntervaloHoras") ?? 24;
        _intervalo = TimeSpan.FromHours(horas <= 0 ? 24 : horas);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var servicio = scope.ServiceProvider.GetRequiredService<IMoraSuspensionService>();
                var suspendidos = await servicio.ProcesarSuspensionesAsync(stoppingToken);

                if (suspendidos > 0)
                {
                    _logger.LogInformation("Job de mora (RN-FIN-02): {Cantidad} socio(s) suspendido(s).", suspendidos);
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Error al procesar suspensiones automáticas por mora (RN-FIN-02).");
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
