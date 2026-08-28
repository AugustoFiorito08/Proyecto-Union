namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Canal de envío de un <see cref="ComunicacionDestinatario"/> (SPEC.md §4.2
/// "ComunicacionDestinatario.Canal"). Novedad es un feed in-app en el Portal del Socio, no
/// un envío saliente (NUEVO-SPEC-UI).
/// </summary>
public enum CanalComunicacion
{
    Email = 1,
    WhatsApp = 2,
    Novedad = 3
}

/// <summary>Resultado del envío por canal (SPEC.md §4.2 "ComunicacionDestinatario.EstadoEnvio").</summary>
public enum EstadoEnvioComunicacion
{
    Pendiente = 1,
    Enviado = 2,
    Fallido = 3
}

/// <summary>
/// Destinatario + canal de una Comunicacion (SPEC.md §4.2 "ComunicacionDestinatario"). Se
/// genera una fila por cada combinación Socio×Canal seleccionada al crear la Comunicacion
/// (<see cref="IComunicacionService"/> en Infrastructure).
/// </summary>
public class ComunicacionDestinatario
{
    public Guid Id { get; set; }

    public Guid ComunicacionId { get; set; }

    public Comunicacion Comunicacion { get; set; } = null!;

    /// <summary>
    /// Decisión de implementación (SPEC.md no aclara si es nullable): todos los flujos de
    /// esta implementación (segmentación manual vía IComunicacionService.ResolverDestinatariosAsync,
    /// job de cumpleaños, job de recordatorio de vencimiento, aviso de suspensión por mora)
    /// restringen los destinatarios a Socios con cuenta propia (UsuarioId != null) — un
    /// Socio sin cuenta no tiene forma de ver el canal Novedad ni de resolverse contra un
    /// Usuario para Email/WhatsApp en este modelo — por lo que se mantiene NOT NULL,
    /// consistente con el texto literal del SPEC ("UsuarioId (FK)").
    /// </summary>
    public Guid UsuarioId { get; set; }

    public ApplicationUser? Usuario { get; set; }

    public CanalComunicacion Canal { get; set; }

    public EstadoEnvioComunicacion EstadoEnvio { get; set; } = EstadoEnvioComunicacion.Pendiente;

    public DateTime? FechaEnvio { get; set; }

    public DateTime? FechaLectura { get; set; }

    /// <summary>
    /// Decisión de implementación (no está en SPEC.md §4.2): motivo de fallo del envío, sin
    /// credenciales ni datos sensibles, para poder mostrarlo en la trazabilidad al staff
    /// (enunciado Etapa 4, punto 1).
    /// </summary>
    public string? MotivoFallo { get; set; }
}
