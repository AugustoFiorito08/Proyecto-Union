namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Envío de WhatsApp vía la API de WhatsApp Business Cloud de Meta (Etapa 4). Si
/// "WhatsApp:AccessToken"/"WhatsApp:PhoneNumberId" no están configurados, la implementación
/// lanza <see cref="InvalidOperationException"/> — el caller (IComunicacionService) la atrapa
/// para marcar el envío como Fallido sin interrumpir el resto de los destinatarios.
/// </summary>
public interface IWhatsAppSender
{
    Task EnviarAsync(string telefonoDestino, string mensaje, CancellationToken cancellationToken = default);
}
