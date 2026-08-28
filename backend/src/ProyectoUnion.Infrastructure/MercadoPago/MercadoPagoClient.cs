using MercadoPago.Client.Payment;
using MercadoPago.Client.Preference;
using MercadoPago.Config;
using Microsoft.Extensions.Configuration;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.MercadoPago;

/// <summary>
/// Envoltorio sobre el SDK oficial de Mercado Pago (paquete NuGet "mercadopago-sdk" —
/// https://www.nuget.org/packages/mercadopago-sdk, namespace raíz <c>MercadoPago</c>, no
/// confundir con el paquete "MercadoPago.SDK" que no existe en NuGet.org, ver reporte final).
/// Lee el access token de "MercadoPago:AccessToken" (appsettings/env, vacío en este entorno
/// — sin credenciales reales, enunciado Etapa 3 punto 4).
/// </summary>
public class MercadoPagoClient : IMercadoPagoClient
{
    private readonly string? _accessToken;

    public MercadoPagoClient(IConfiguration configuration)
    {
        _accessToken = configuration["MercadoPago:AccessToken"];
    }

    public bool EstaConfigurado => !string.IsNullOrWhiteSpace(_accessToken);

    public async Task<string> CrearPreferenciaDeCheckoutAsync(
        string titulo, decimal importe, string referenciaExterna, CancellationToken cancellationToken)
    {
        if (!EstaConfigurado)
        {
            throw new InvalidOperationException("Mercado Pago no está configurado en este entorno.");
        }

        MercadoPagoConfig.AccessToken = _accessToken;

        var request = new PreferenceRequest
        {
            Items = new List<PreferenceItemRequest>
            {
                new()
                {
                    Title = titulo,
                    Quantity = 1,
                    CurrencyId = "ARS",
                    UnitPrice = importe
                }
            },
            ExternalReference = referenciaExterna
        };

        var client = new PreferenceClient();
        var preference = await client.CreateAsync(request);

        return preference.InitPoint ?? preference.SandboxInitPoint
            ?? throw new InvalidOperationException("Mercado Pago no devolvió una URL de checkout.");
    }

    public async Task<(string? Status, string? ExternalReference)> ObtenerPagoAsync(
        string mercadoPagoPaymentId, CancellationToken cancellationToken)
    {
        if (!EstaConfigurado)
        {
            throw new InvalidOperationException("Mercado Pago no está configurado en este entorno.");
        }

        if (!long.TryParse(mercadoPagoPaymentId, out var paymentId))
        {
            return (null, null);
        }

        MercadoPagoConfig.AccessToken = _accessToken;

        var client = new PaymentClient();
        var pago = await client.GetAsync(paymentId);

        return (pago.Status, pago.ExternalReference);
    }
}
