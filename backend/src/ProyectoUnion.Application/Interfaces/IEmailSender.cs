namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Envío de email transaccional (MailKit contra un SMTP configurado, Etapa 4). Si
/// "Email:Smtp:Host" no está configurado, la implementación lanza
/// <see cref="InvalidOperationException"/> — el caller (IComunicacionService, AuthController,
/// SociosController, InstructoresController) la atrapa y degrada según corresponda, nunca la
/// deja llegar sin manejar a un controller.
/// </summary>
public interface IEmailSender
{
    Task EnviarAsync(string destinatarioEmail, string asunto, string contenidoHtml, CancellationToken cancellationToken = default);
}
