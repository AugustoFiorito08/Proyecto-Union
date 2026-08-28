using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Application.Security;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 3, enunciado punto 4: ejercita el parseo/validación del webhook de Mercado Pago
/// (firma HMAC del header x-signature y deserialización del payload del evento "payment")
/// sin credenciales reales ni red — toda la lógica es pura.
/// </summary>
public class MercadoPagoSignatureValidatorTests
{
    private const string Secret = "test-secret-no-es-real";

    [Fact]
    public void Validar_ConFirmaCorrecta_DevuelveTrue()
    {
        const string dataId = "123456789";
        const string requestId = "req-abc-123";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var v1 = CalcularFirma(dataId, requestId, ts, Secret);
        var xSignature = $"ts={ts},v1={v1}";

        MercadoPagoSignatureValidator.Validar(xSignature, requestId, dataId, Secret).Should().BeTrue();
    }

    [Fact]
    public void Validar_ConFirmaAlterada_DevuelveFalse()
    {
        const string dataId = "123456789";
        const string requestId = "req-abc-123";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var v1 = CalcularFirma(dataId, requestId, ts, Secret);
        var xSignatureAlterada = $"ts={ts},v1={v1[..^4]}0000";

        MercadoPagoSignatureValidator.Validar(xSignatureAlterada, requestId, dataId, Secret).Should().BeFalse();
    }

    [Fact]
    public void Validar_ConDataIdDistintoAlFirmado_DevuelveFalse()
    {
        const string requestId = "req-abc-123";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var v1 = CalcularFirma("111", requestId, ts, Secret);
        var xSignature = $"ts={ts},v1={v1}";

        // Alguien reenvía la notificación cambiando data.id: la firma ya no corresponde.
        MercadoPagoSignatureValidator.Validar(xSignature, requestId, "222", Secret).Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("formato-invalido-sin-ts-ni-v1")]
    public void Validar_ConHeaderMalformado_DevuelveFalse(string? xSignature)
    {
        MercadoPagoSignatureValidator.Validar(xSignature, "req-1", "123", Secret).Should().BeFalse();
    }

    [Fact]
    public void Validar_SinSecretoConfigurado_DevuelveFalse()
    {
        MercadoPagoSignatureValidator.Validar("ts=1,v1=abc", "req-1", "123", null).Should().BeFalse();
    }

    [Fact]
    public void MercadoPagoWebhookNotification_DeserializaPayloadDeEjemploDelEventoPayment()
    {
        // Forma real de la notificación que envía Mercado Pago para el tipo de evento
        // "payment" (documentación pública de MP) — sin datos reales.
        const string payloadEjemplo = """
        {
          "action": "payment.updated",
          "api_version": "v1",
          "data": { "id": "123456789" },
          "date_created": "2026-01-01T10:00:00Z",
          "id": 999,
          "live_mode": false,
          "type": "payment",
          "user_id": "246813"
        }
        """;

        var notificacion = JsonSerializer.Deserialize<MercadoPagoWebhookNotification>(
            payloadEjemplo, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        notificacion.Should().NotBeNull();
        notificacion!.Type.Should().Be("payment");
        notificacion.Action.Should().Be("payment.updated");
        notificacion.Data.Should().NotBeNull();
        notificacion.Data!.Id.Should().Be("123456789");
    }

    [Fact]
    public void MercadoPagoWebhookNotification_ConTipoDeEventoDistinto_NoEsPayment()
    {
        const string payloadMerchantOrder = """{ "type": "merchant_order", "data": { "id": "1" } }""";

        var notificacion = JsonSerializer.Deserialize<MercadoPagoWebhookNotification>(
            payloadMerchantOrder, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        notificacion!.Type.Should().NotBe("payment");
    }

    private static string CalcularFirma(string dataId, string requestId, string ts, string secret)
    {
        var manifest = $"id:{dataId};request-id:{requestId};ts:{ts};";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();
    }
}
