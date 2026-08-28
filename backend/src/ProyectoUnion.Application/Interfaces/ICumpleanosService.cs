namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Job de cumpleaños (RF-COM-24, SPEC.md §6 Etapa 4), corrido por
/// <c>CumpleanosHostedService</c> cada <c>Cumpleanos:IntervaloHoras</c>.
/// </summary>
public interface ICumpleanosService
{
    /// <summary>
    /// Crea y envía una Comunicacion tipo Cumpleanos a cada Socio Activo con cuenta propia
    /// cuyo FechaNacimiento (mes+día) coincide con la fecha actual. Devuelve la cantidad de
    /// socios notificados en esta corrida.
    /// </summary>
    Task<int> ProcesarCumpleanosDelDiaAsync(CancellationToken cancellationToken);
}
