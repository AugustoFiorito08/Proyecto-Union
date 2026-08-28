using ProyectoUnion.Application.Dtos.Comunicaciones;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Lógica compartida de creación/envío de Comunicaciones (SPEC.md §5 "Comunicaciones",
/// enunciado Etapa 4), usada por <c>ComunicacionesController</c> (staff) y por los jobs de
/// cumpleaños/recordatorio de vencimiento y por <c>IMoraSuspensionService</c> (aviso de
/// suspensión, cierre del gap de Etapa 3).
/// </summary>
public interface IComunicacionService
{
    /// <summary>
    /// Resuelve un segmento a la lista de Socios Activos con cuenta propia (UsuarioId !=
    /// null) que matchean. Exactamente uno de los cuatro campos del segmento debe estar
    /// activo (enunciado Etapa 4, punto 4); si no, lanza <see cref="ArgumentException"/>.
    /// </summary>
    Task<IReadOnlyList<Socio>> ResolverDestinatariosAsync(SegmentoDestinatariosRequest segmento, CancellationToken cancellationToken);

    /// <summary>
    /// Crea la Comunicacion (Estado=Borrador) + un ComunicacionDestinatario por cada
    /// combinación Socio×Canal resuelta del segmento.
    /// </summary>
    Task<ResultadoComunicacion> CrearComunicacionAsync(CrearComunicacionRequest request, Guid creadoPorUsuarioId, CancellationToken cancellationToken);

    /// <summary>
    /// Reemplaza asunto/descripción/contenido/tipo/segmento/canales de una Comunicacion en
    /// Estado=Borrador (recalcula sus ComunicacionDestinatario desde cero).
    /// </summary>
    Task<ResultadoComunicacion> ActualizarComunicacionAsync(Guid comunicacionId, ActualizarComunicacionRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Envía cada ComunicacionDestinatario Pendiente según su Canal (Novedad se marca
    /// Enviado directo; Email/WhatsApp llaman al sender correspondiente, atrapando el fallo
    /// de cada destinatario sin interrumpir a los demás). Al terminar, Estado=Enviada y
    /// FechaUltimoEnvio=UtcNow.
    /// </summary>
    Task<ResultadoComunicacion> EnviarAsync(Guid comunicacionId, CancellationToken cancellationToken);

    /// <summary>
    /// Setea FechaProgramada y Estado=Programada; el envío real lo dispara
    /// <c>ComunicacionProgramadaHostedService</c>, que cada cierto intervalo busca
    /// Comunicacion Programada con FechaProgramada &lt;= UtcNow y llama <see cref="EnviarAsync"/>.
    /// </summary>
    Task<ResultadoComunicacion> ProgramarAsync(Guid comunicacionId, DateTime fechaProgramada, CancellationToken cancellationToken);

    /// <summary>
    /// Crea y envía de inmediato una Comunicacion dirigida a un único Socio ya conocido (no
    /// pasa por ResolverDestinatariosAsync). Usada por los jobs de cumpleaños/recordatorio de
    /// vencimiento y por el aviso de suspensión por mora. Si el Socio no tiene cuenta propia
    /// (UsuarioId null) no genera ninguna Comunicacion y devuelve null — ver decisión de
    /// diseño en ComunicacionDestinatario.UsuarioId.
    /// </summary>
    Task<Comunicacion?> CrearYEnviarASocioAsync(
        Guid socioId,
        string asunto,
        string contenidoHtml,
        TipoComunicacion tipoComunicacion,
        IReadOnlyCollection<CanalComunicacion> canales,
        Guid? creadoPorUsuarioId,
        CancellationToken cancellationToken);
}
