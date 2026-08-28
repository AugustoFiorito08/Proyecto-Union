using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using ProyectoUnion.API.Controllers;
using ProyectoUnion.Application.Dtos.Auth;
using ProyectoUnion.Application.Tests.Fakes;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Identity;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10, RN-LOG-01): cubre el lockout de cuenta instrumentado
/// manualmente en <see cref="AuthController.Login"/> — este proyecto usa
/// <c>AddIdentityCore</c> + <c>UserManager</c> directo (no <c>SignInManager</c>, no registrado
/// en DI), así que IsLockedOutAsync/AccessFailedAsync/ResetAccessFailedCountAsync se invocan a
/// mano en el controller. Mismo patrón de setup que <c>SolicitudMembresiaServiceTests</c>:
/// ServiceCollection con AddDbContext InMemory + AddIdentityCore reales, resolviendo
/// UserManager/RoleManager reales por DI (misma configuración de Lockout que producción, ver
/// DependencyInjection.AddInfrastructure).
/// </summary>
public class AuthControllerLockoutTests
{
    private const string PasswordCorrecta = "Password1";
    private const string PasswordIncorrecta = "Incorrecta1";

    [Fact]
    public async Task Login_ConCincoIntentosFallidos_DevuelveUnauthorizedEnTodos()
    {
        await using var contexto = await CrearContextoAsync();

        for (var intento = 1; intento <= 5; intento++)
        {
            var resultado = await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordIncorrecta));
            resultado.Result.Should().BeOfType<UnauthorizedObjectResult>($"intento {intento} con password incorrecta debe fallar");
        }

        (await contexto.UserManager.IsLockedOutAsync(contexto.Usuario)).Should().BeTrue();
    }

    [Fact]
    public async Task Login_IntentoNumeroSeisConPasswordCorrecta_DevuelveUnauthorizedPorCuentaBloqueada()
    {
        await using var contexto = await CrearContextoAsync();

        for (var intento = 1; intento <= 5; intento++)
        {
            await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordIncorrecta));
        }

        var sextoIntento = await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordCorrecta));

        sextoIntento.Result.Should().BeOfType<UnauthorizedObjectResult>();
        (await contexto.UserManager.IsLockedOutAsync(contexto.Usuario)).Should().BeTrue();
    }

    [Fact]
    public async Task Login_ConIntentosFallidosPorDebajoDelUmbralYLuegoExitoso_DevuelveOkYReseteaContador()
    {
        await using var contexto = await CrearContextoAsync();

        await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordIncorrecta));
        await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordIncorrecta));

        var resultadoExitoso = await contexto.Controller.Login(new LoginRequest(contexto.Usuario.Email!, PasswordCorrecta));

        resultadoExitoso.Result.Should().BeOfType<OkObjectResult>();

        var usuarioActualizado = await contexto.UserManager.FindByIdAsync(contexto.Usuario.Id.ToString());
        (await contexto.UserManager.GetAccessFailedCountAsync(usuarioActualizado!)).Should().Be(0);
        (await contexto.UserManager.IsLockedOutAsync(usuarioActualizado!)).Should().BeFalse();
    }

    private static async Task<ContextoDeTest> CrearContextoAsync()
    {
        var services = new ServiceCollection();

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(Guid.NewGuid().ToString()));

        services.AddSingleton<IDataProtectionProvider, EphemeralDataProtectionProvider>();
        services.AddLogging();

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireDigit = true;
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;

                // Misma configuración de Lockout que producción (DependencyInjection.AddInfrastructure).
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        var provider = services.BuildServiceProvider();

        var dbContext = provider.GetRequiredService<ApplicationDbContext>();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<ApplicationRole>>();

        var rol = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = "Socio",
            NivelJerarquico = 4,
            EsRolDeSistema = true,
            Estado = EstadoRol.Activo
        };
        (await roleManager.CreateAsync(rol)).Succeeded.Should().BeTrue();

        var usuario = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "socio.lockout@test.local",
            Email = "socio.lockout@test.local",
            RolId = rol.Id,
            Estado = EstadoUsuario.Activo
        };
        (await userManager.CreateAsync(usuario, PasswordCorrecta)).Succeeded.Should().BeTrue();

        var jwtOptions = Options.Create(new JwtOptions
        {
            Secret = "clave-de-prueba-suficientemente-larga-para-hmac-sha256",
            Issuer = "ProyectoUnion.API.Tests",
            Audience = "ProyectoUnion.Clients.Tests",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        });
        var jwtTokenService = new JwtTokenService(jwtOptions);

        var controller = new AuthController(
            userManager,
            roleManager,
            jwtTokenService,
            dbContext,
            new FakeEmailSender(),
            NullLogger<AuthController>.Instance);

        return new ContextoDeTest(provider, dbContext, userManager, controller, usuario);
    }

    private sealed class ContextoDeTest : IAsyncDisposable
    {
        public ContextoDeTest(
            ServiceProvider provider,
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            AuthController controller,
            ApplicationUser usuario)
        {
            Provider = provider;
            DbContext = dbContext;
            UserManager = userManager;
            Controller = controller;
            Usuario = usuario;
        }

        public ServiceProvider Provider { get; }

        public ApplicationDbContext DbContext { get; }

        public UserManager<ApplicationUser> UserManager { get; }

        public AuthController Controller { get; }

        public ApplicationUser Usuario { get; }

        public async ValueTask DisposeAsync()
        {
            await DbContext.DisposeAsync();
            await Provider.DisposeAsync();
        }
    }
}
