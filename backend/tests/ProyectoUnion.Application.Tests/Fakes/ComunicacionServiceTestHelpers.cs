using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Infrastructure.Comunicaciones;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Application.Tests.Fakes;

/// <summary>
/// Fakes de <see cref="IEmailSender"/>/<see cref="IWhatsAppSender"/> para tests que ejercitan
/// código que depende de <see cref="IComunicacionService"/> (MoraSuspensionService,
/// CumpleanosService, RecordatorioVencimientoService) sin requerir SMTP/WhatsApp reales.
/// </summary>
public class FakeEmailSender : IEmailSender
{
    public List<(string Destinatario, string Asunto)> Enviados { get; } = new();

    public Task EnviarAsync(string destinatarioEmail, string asunto, string contenidoHtml, CancellationToken cancellationToken = default)
    {
        Enviados.Add((destinatarioEmail, asunto));
        return Task.CompletedTask;
    }
}

public class FakeWhatsAppSender : IWhatsAppSender
{
    public List<(string Telefono, string Mensaje)> Enviados { get; } = new();

    public Task EnviarAsync(string telefonoDestino, string mensaje, CancellationToken cancellationToken = default)
    {
        Enviados.Add((telefonoDestino, mensaje));
        return Task.CompletedTask;
    }
}

public static class ComunicacionServiceTestHelpers
{
    public static ComunicacionService CrearComunicacionServiceFake(
        ApplicationDbContext dbContext,
        FakeEmailSender? emailSender = null,
        FakeWhatsAppSender? whatsAppSender = null)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AppBaseUrl"] = "http://localhost:5000"
        }).Build();

        return new ComunicacionService(
            dbContext,
            emailSender ?? new FakeEmailSender(),
            whatsAppSender ?? new FakeWhatsAppSender(),
            configuration,
            NullLogger<ComunicacionService>.Instance);
    }
}
