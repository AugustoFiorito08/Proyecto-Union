using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Implementación de <see cref="IWhatsAppSender"/> vía la API de WhatsApp Business Cloud de
/// Meta (Etapa 4, "WhatsApp:{AccessToken,PhoneNumberId}"). Si no está configurado, lanza
/// <see cref="InvalidOperationException"/> — ComunicacionService la atrapa para marcar el
/// destinatario como Fallido sin interrumpir el resto del envío.
/// </summary>
public class WhatsAppSender : IWhatsAppSender
{
    private const string GraphApiVersion = "v20.0";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public WhatsAppSender(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task EnviarAsync(string telefonoDestino, string mensaje, CancellationToken cancellationToken = default)
    {
        var accessToken = _configuration["WhatsApp:AccessToken"];
        var phoneNumberId = _configuration["WhatsApp:PhoneNumberId"];

        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(phoneNumberId))
        {
            throw new InvalidOperationException("El envío de WhatsApp no está configurado en este entorno (WhatsApp:AccessToken/WhatsApp:PhoneNumberId).");
        }

        var url = $"https://graph.facebook.com/{GraphApiVersion}/{phoneNumberId}/messages";

        var body = new
        {
            messaging_product = "whatsapp",
            to = telefonoDestino,
            type = "text",
            text = new { preview_url = false, body = mensaje }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var detalle = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Falló el envío de WhatsApp ({(int)response.StatusCode}): {detalle}");
        }
    }
}
