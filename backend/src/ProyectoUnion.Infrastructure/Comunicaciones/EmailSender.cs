using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Implementación de <see cref="IEmailSender"/> vía MailKit contra un SMTP configurado
/// (Etapa 4, "Email:Smtp:{Host,Port,User,Password,From}"). Si "Email:Smtp:Host" no está
/// configurado, lanza <see cref="InvalidOperationException"/> — el caller decide cómo
/// degradar (ComunicacionService marca el destinatario Fallido; AuthController/
/// SociosController/InstructoresController caen al fallback de mostrar la credencial en
/// claro en la respuesta).
/// </summary>
public class EmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;

    public EmailSender(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task EnviarAsync(string destinatarioEmail, string asunto, string contenidoHtml, CancellationToken cancellationToken = default)
    {
        var host = _configuration["Email:Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            throw new InvalidOperationException("El envío de email no está configurado en este entorno (Email:Smtp:Host).");
        }

        var portConfigurado = _configuration["Email:Smtp:Port"];
        var port = int.TryParse(portConfigurado, out var puertoParseado) ? puertoParseado : 587;
        var user = _configuration["Email:Smtp:User"];
        var password = _configuration["Email:Smtp:Password"];
        var from = _configuration["Email:Smtp:From"];

        if (string.IsNullOrWhiteSpace(from))
        {
            throw new InvalidOperationException("El envío de email no está configurado en este entorno (Email:Smtp:From).");
        }

        var mensaje = new MimeMessage();
        mensaje.From.Add(MailboxAddress.Parse(from));
        mensaje.To.Add(MailboxAddress.Parse(destinatarioEmail));
        mensaje.Subject = asunto;
        mensaje.Body = new BodyBuilder { HtmlBody = contenidoHtml }.ToMessageBody();

        using var cliente = new SmtpClient();
        await cliente.ConnectAsync(host, port, SecureSocketOptions.StartTlsWhenAvailable, cancellationToken);

        if (!string.IsNullOrWhiteSpace(user))
        {
            await cliente.AuthenticateAsync(user, password ?? string.Empty, cancellationToken);
        }

        await cliente.SendAsync(mensaje, cancellationToken);
        await cliente.DisconnectAsync(true, cancellationToken);
    }
}
