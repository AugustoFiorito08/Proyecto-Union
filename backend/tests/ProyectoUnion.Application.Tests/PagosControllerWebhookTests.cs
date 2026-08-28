using System.Security.Cryptography;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ProyectoUnion.API.Controllers;
using ProyectoUnion.Application.Dtos.Pagos;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10): cubre el bug real corregido en
/// <see cref="PagosController.Webhook"/> — el gate de validación de firma dependía solo de si
/// "MercadoPago:WebhookSecret" estaba seteado, en vez de depender de si Mercado Pago está
/// configurado (<see cref="IMercadoPagoClient.EstaConfigurado"/>, basado en AccessToken). Con
/// AccessToken seteado y WebhookSecret vacío, el webhook procesaba pagos sin validar firma.
/// Ahora responde 500 en ese caso. Instanciación directa del controller (mismo patrón que
/// ReportesControllerTests), con un fake de <see cref="IMercadoPagoClient"/> configurable y
/// fakes de <see cref="IPagoService"/>/<see cref="IComprobantePdfGenerator"/> que lanzan si se
/// invocan — no deberían llamarse en ninguno de los 3 casos cubiertos acá.
/// </summary>
public class PagosControllerWebhookTests
{
    private const string DataId = "123456789";
    private const string WebhookSecret = "un-secreto-de-prueba-bien-largo";

    [Fact]
    public async Task Webhook_ConAccessTokenSeteadoYWebhookSecretVacio_Devuelve500()
    {
        var controller = CrearController(
            estaConfigurado: true,
            webhookSecret: string.Empty,
            out _);

        var resultado = await controller.Webhook(CancellationToken.None);

        var objectResult = resultado.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
    }

    [Fact]
    public async Task Webhook_ConAccessTokenVacio_MantieneComportamientoActualDeEarlyExit()
    {
        var controller = CrearController(
            estaConfigurado: false,
            webhookSecret: string.Empty,
            out _);

        var resultado = await controller.Webhook(CancellationToken.None);

        resultado.Should().BeOfType<OkResult>();
    }

    [Fact]
    public async Task Webhook_ConAmbosSeteadosYFirmaInvalida_Devuelve401()
    {
        var controller = CrearController(
            estaConfigurado: true,
            webhookSecret: WebhookSecret,
            out var httpContext,
            xSignature: "ts=1700000000,v1=firmainvalida");

        var resultado = await controller.Webhook(CancellationToken.None);

        resultado.Should().BeOfType<UnauthorizedObjectResult>();
    }

    private static PagosController CrearController(
        bool estaConfigurado,
        string webhookSecret,
        out DefaultHttpContext httpContext,
        string? xSignature = null)
    {
        var dbContext = CrearDbContext();

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["MercadoPago:WebhookSecret"] = webhookSecret
        }).Build();

        var mercadoPagoClient = new FakeMercadoPagoClient(estaConfigurado);
        var pagoService = new ThrowingPagoService();
        var comprobantePdfGenerator = new ThrowingComprobantePdfGenerator();

        var controller = new PagosController(
            dbContext,
            pagoService,
            mercadoPagoClient,
            comprobantePdfGenerator,
            configuration,
            NullLogger<PagosController>.Instance);

        var bodyJson = System.Text.Json.JsonSerializer.Serialize(new MercadoPagoWebhookNotification("payment", "payment.created", new MercadoPagoWebhookData(DataId)));
        httpContext = new DefaultHttpContext
        {
            Request = { Body = new MemoryStream(Encoding.UTF8.GetBytes(bodyJson)) }
        };

        if (xSignature is not null)
        {
            httpContext.Request.Headers["x-signature"] = xSignature;
            httpContext.Request.Headers["x-request-id"] = "req-1";
        }

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        return controller;
    }

    private static ApplicationDbContext CrearDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, new EphemeralDataProtectionProvider());
    }

    private sealed class FakeMercadoPagoClient : IMercadoPagoClient
    {
        public FakeMercadoPagoClient(bool estaConfigurado)
        {
            EstaConfigurado = estaConfigurado;
        }

        public bool EstaConfigurado { get; }

        public Task<string> CrearPreferenciaDeCheckoutAsync(string titulo, decimal importe, string referenciaExterna, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("No debería llamarse en los tests del webhook.");

        public Task<(string? Status, string? ExternalReference)> ObtenerPagoAsync(string mercadoPagoPaymentId, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("No debería llamarse cuando la firma es inválida o la configuración está incompleta.");
    }

    private sealed class ThrowingPagoService : IPagoService
    {
        public Task<ResultadoPago> CrearPagosAsync(CrearPagoRequest request, Socio? socioActual, bool confirmarInmediatamente, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("No debería llamarse en los tests del webhook.");

        public Task<bool> ConfirmarPagoAsync(Guid pagoId, string? mercadoPagoTransaccionId, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("No debería llamarse en los tests del webhook.");

        public Task<bool> RechazarPagoAsync(Guid pagoId, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("No debería llamarse en los tests del webhook.");
    }

    private sealed class ThrowingComprobantePdfGenerator : IComprobantePdfGenerator
    {
        public byte[] GenerarComprobantePdf(Pago pago) =>
            throw new InvalidOperationException("No debería llamarse en los tests del webhook.");
    }
}
