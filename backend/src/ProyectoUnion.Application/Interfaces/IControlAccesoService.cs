using ProyectoUnion.Application.Dtos.ControlAcceso;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Validación de acceso por QR en portería (RN-ACC-02/03/04, SPEC.md §3.1, Etapa 5).
/// </summary>
public interface IControlAccesoService
{
    /// <summary>
    /// Ejecuta la cadena de validaciones de RN-ACC-02 en orden (Socio existe → Estado del
    /// Socio → mora más allá de la tolerancia → vigencia de Ficha Médica), cortando en la
    /// primera que falle, y registra el intento en <c>RegistroAcceso</c> sin importar el
    /// resultado (RN-ACC-03/04).
    /// </summary>
    Task<ValidarAccesoResponse> ValidarAsync(string codigoQr, Guid operadorUsuarioId, CancellationToken cancellationToken);
}
