using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10): cubre que la policy de rate limiting "auth" (aplicada a
/// AuthController.Login vía [EnableRateLimiting("auth")], configurada en Program.cs con
/// AddRateLimiter + AddFixedWindowLimiter) efectivamente rechaza con 429 una vez agotado el
/// límite ("RateLimiting:AuthPermitLimit" = 10 por ventana de 1 minuto en appsettings.json).
///
/// NOTA: primer test del repo que usa <see cref="WebApplicationFactory{TEntryPoint}"/> (host
/// real de principio a fin, en vez de instanciar el controller directamente como el resto de
/// los tests de este proyecto) — hace falta para ejercitar el pipeline de middlewares
/// (UseRateLimiter) y no solo la acción del controller. No requiere Postgres/Docker levantado:
/// Program.cs ya tolera el fallo de migración al arrancar (try/catch), y las requests de este
/// test solo necesitan llegar al rate limiter — les da igual si el login individual termina en
/// 401/500 por no haber base de datos disponible; lo único que se verifica es el código de la
/// request que excede el límite.
/// </summary>
public class RateLimitingTests
{
    [Fact]
    public async Task Login_LuegoDeAgotarElLimiteDeLaPolicyAuth_DevuelveTooManyRequests()
    {
        await using var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder => builder.UseEnvironment("Development"));

        using var client = factory.CreateClient();

        const int authPermitLimit = 10; // RateLimiting:AuthPermitLimit en appsettings.json
        HttpResponseMessage? ultimaRespuesta = null;

        for (var intento = 1; intento <= authPermitLimit + 1; intento++)
        {
            var body = new StringContent(
                """{"email":"quien-sea@test.local","password":"cualquiera"}""",
                Encoding.UTF8,
                "application/json");

            ultimaRespuesta = await client.PostAsync("/api/auth/login", body);
        }

        ultimaRespuesta.Should().NotBeNull();
        ultimaRespuesta!.StatusCode.Should().Be((HttpStatusCode)StatusCodes.Status429TooManyRequests);
    }
}
