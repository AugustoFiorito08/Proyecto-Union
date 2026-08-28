namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Job de recordatorio de vencimiento de cuota (RF-COM-26, SPEC.md §6 Etapa 4), corrido por
/// <c>RecordatorioVencimientoHostedService</c> cada
/// <c>RecordatorioVencimiento:IntervaloHoras</c>.
/// </summary>
public interface IRecordatorioVencimientoService
{
    /// <summary>
    /// Crea y envía una Comunicacion tipo Recordatorio al Socio/titular del grupo por cada
    /// Cuota Pendiente cuya FechaVencimiento cae dentro de
    /// "RecordatorioVencimiento:DiasAnticipacion" días desde hoy, evitando duplicar el mismo
    /// recordatorio para la misma Cuota. Devuelve la cantidad de recordatorios enviados en
    /// esta corrida.
    /// </summary>
    Task<int> ProcesarRecordatoriosAsync(CancellationToken cancellationToken);
}
