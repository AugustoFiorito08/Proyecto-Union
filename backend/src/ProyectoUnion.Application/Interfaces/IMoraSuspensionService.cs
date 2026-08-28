namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Suspensión automática por mora prolongada (RN-FIN-02, SPEC.md §3.2), corrida por
/// <c>MoraSuspensionHostedService</c> cada <c>MoraSuspension:IntervaloHoras</c>. No reactiva
/// automáticamente (la reactivación requiere confirmación manual de Administrador/Empleado,
/// ver RN-SOC-01/§3.3).
/// </summary>
public interface IMoraSuspensionService
{
    /// <summary>
    /// Suspende (Socio.Estado = Suspendido) a todo Socio Activo con al menos una Cuota
    /// Vencida cuya antigüedad, en meses, supere ConfiguracionGeneral.MaximaDeudaEnMeses.
    /// Devuelve la cantidad de socios suspendidos en esta corrida.
    /// </summary>
    Task<int> ProcesarSuspensionesAsync(CancellationToken cancellationToken);
}
