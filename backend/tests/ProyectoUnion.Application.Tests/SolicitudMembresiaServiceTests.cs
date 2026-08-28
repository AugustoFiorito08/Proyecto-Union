using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;
using ProyectoUnion.Infrastructure.Solicitudes;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 6, enunciado punto 2 (SPEC.md §5 "Solicitudes de Membresía"): cubre el ciclo de vida
/// de SolicitudMembresiaService — alta pública, unicidad cruzada de DNI (contra Socio y contra
/// otra solicitud Pendiente), aprobación (creación de Socio + reasignación de rol NoSocio→Socio
/// del mismo ApplicationUser) y rechazo con motivo. Usa el proveedor InMemory de EF Core, mismo
/// criterio que ControlAccesoServiceTests/MoraSuspensionServiceTests, sumando acá
/// UserManager/RoleManager de Identity reales (AddIdentityCore + AddEntityFrameworkStores)
/// porque el servicio bajo prueba depende de ambos.
/// </summary>
public class SolicitudMembresiaServiceTests
{
    [Fact]
    public async Task CrearAsync_ConDatosValidos_CreaSolicitudPendienteYUsuarioNoSocio()
    {
        await using var contexto = await CrearContextoAsync();

        var request = CrearRequestValido();

        var resultado = await contexto.Servicio.CrearAsync(request, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);
        resultado.SolicitudId.Should().NotBeNull();

        var solicitud = await contexto.DbContext.SolicitudesMembresia.AsNoTracking().SingleAsync();
        solicitud.Estado.Should().Be(EstadoSolicitudMembresia.Pendiente);
        solicitud.DNI.Should().Be(request.DNI);
        solicitud.Email.Should().Be(request.Email);
        solicitud.NumeroSolicitud.Should().NotBeNullOrWhiteSpace();

        var usuario = await contexto.UserManager.FindByEmailAsync(request.Email);
        usuario.Should().NotBeNull();
        usuario!.RolId.Should().Be(contexto.RolNoSocio.Id);

        solicitud.UsuarioId.Should().Be(usuario.Id);
    }

    [Fact]
    public async Task CrearAsync_ConDniDeSocioExistente_RechazaComoInvalido()
    {
        await using var contexto = await CrearContextoAsync();

        var categoria = await SembrarCategoriaAsync(contexto.DbContext, "Activo");
        var dniExistente = "30111222";
        contexto.DbContext.Socios.Add(CrearSocio(categoria.Id, dniExistente, "socio.existente@clubunion.local"));
        await contexto.DbContext.SaveChangesAsync();

        var request = CrearRequestValido(dni: dniExistente);

        var resultado = await contexto.Servicio.CrearAsync(request, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Invalido);
        (await contexto.DbContext.SolicitudesMembresia.CountAsync()).Should().Be(0);
        (await contexto.UserManager.FindByEmailAsync(request.Email)).Should().BeNull();
    }

    [Fact]
    public async Task CrearAsync_ConDniDeOtraSolicitudPendiente_RechazaComoInvalido()
    {
        await using var contexto = await CrearContextoAsync();

        var dniCompartido = "30111222";
        var primeraSolicitud = CrearRequestValido(dni: dniCompartido, email: "primer.solicitante@clubunion.local");
        var primerResultado = await contexto.Servicio.CrearAsync(primeraSolicitud, CancellationToken.None);
        primerResultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);

        var segundaSolicitud = CrearRequestValido(dni: dniCompartido, email: "segundo.solicitante@clubunion.local");

        var resultado = await contexto.Servicio.CrearAsync(segundaSolicitud, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Invalido);
        (await contexto.DbContext.SolicitudesMembresia.CountAsync()).Should().Be(1);
        (await contexto.UserManager.FindByEmailAsync(segundaSolicitud.Email)).Should().BeNull();
    }

    [Fact]
    public async Task AprobarAsync_ConSolicitudPendiente_CreaSocioYReasignaRolDeNoSocioASocio()
    {
        await using var contexto = await CrearContextoAsync();

        var categoria = await SembrarCategoriaAsync(contexto.DbContext, "Activo");

        var request = CrearRequestValido(categoriaPretendidaId: categoria.Id);
        var creacion = await contexto.Servicio.CrearAsync(request, CancellationToken.None);
        creacion.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);

        var resultado = await contexto.Servicio.AprobarAsync(creacion.SolicitudId!.Value, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);
        resultado.SocioId.Should().NotBeNull();

        var socio = await contexto.DbContext.Socios.AsNoTracking().SingleAsync();
        socio.Id.Should().Be(resultado.SocioId!.Value);
        socio.DNI.Should().Be(request.DNI);
        socio.Email.Should().Be(request.Email);
        socio.Nombres.Should().Be(request.Nombre);
        socio.Apellido.Should().Be(request.Apellido);
        socio.CategoriaId.Should().Be(categoria.Id);
        socio.CodigoQr.Should().NotBeNullOrWhiteSpace();
        socio.Estado.Should().Be(EstadoSocio.Activo);

        var solicitud = await contexto.DbContext.SolicitudesMembresia.AsNoTracking().SingleAsync();
        solicitud.Estado.Should().Be(EstadoSolicitudMembresia.Aprobada);

        var usuario = await contexto.UserManager.FindByEmailAsync(request.Email);
        usuario.Should().NotBeNull();
        usuario!.RolId.Should().Be(contexto.RolSocio.Id);
        usuario.RolId.Should().NotBe(contexto.RolNoSocio.Id);
        socio.UsuarioId.Should().Be(usuario.Id);
    }

    [Fact]
    public async Task AprobarAsync_SinCategoriaPretendida_UsaLaPrimeraCategoriaActivaComoFallback()
    {
        await using var contexto = await CrearContextoAsync();

        await SembrarCategoriaAsync(contexto.DbContext, "Vitalicio");
        var categoriaEsperada = await SembrarCategoriaAsync(contexto.DbContext, "Activo");

        var request = CrearRequestValido(categoriaPretendidaId: null);
        var creacion = await contexto.Servicio.CrearAsync(request, CancellationToken.None);

        var resultado = await contexto.Servicio.AprobarAsync(creacion.SolicitudId!.Value, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);

        var socio = await contexto.DbContext.Socios.AsNoTracking().SingleAsync();
        socio.CategoriaId.Should().Be(categoriaEsperada.Id);
    }

    [Fact]
    public async Task RechazarAsync_ConMotivo_MarcaLaSolicitudRechazadaYNoTocaUsuario()
    {
        await using var contexto = await CrearContextoAsync();

        var request = CrearRequestValido();
        var creacion = await contexto.Servicio.CrearAsync(request, CancellationToken.None);

        var resultado = await contexto.Servicio.RechazarAsync(creacion.SolicitudId!.Value, "No cumple los requisitos.", CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Ok);

        var solicitud = await contexto.DbContext.SolicitudesMembresia.AsNoTracking().SingleAsync();
        solicitud.Estado.Should().Be(EstadoSolicitudMembresia.Rechazada);
        solicitud.MotivoRechazo.Should().Be("No cumple los requisitos.");

        (await contexto.DbContext.Socios.CountAsync()).Should().Be(0);

        var usuario = await contexto.UserManager.FindByEmailAsync(request.Email);
        usuario!.RolId.Should().Be(contexto.RolNoSocio.Id);
    }

    [Fact]
    public async Task RechazarAsync_SinMotivo_RechazaComoInvalido()
    {
        await using var contexto = await CrearContextoAsync();

        var request = CrearRequestValido();
        var creacion = await contexto.Servicio.CrearAsync(request, CancellationToken.None);

        var resultado = await contexto.Servicio.RechazarAsync(creacion.SolicitudId!.Value, string.Empty, CancellationToken.None);

        resultado.Estado.Should().Be(ResultadoSolicitudMembresiaEstado.Invalido);

        var solicitud = await contexto.DbContext.SolicitudesMembresia.AsNoTracking().SingleAsync();
        solicitud.Estado.Should().Be(EstadoSolicitudMembresia.Pendiente);
    }

    private static CrearSolicitudMembresiaRequest CrearRequestValido(
        string dni = "30111222",
        string email = "solicitante@clubunion.local",
        Guid? categoriaPretendidaId = null) => new(
        "Juan",
        "Pérez",
        dni,
        new DateTime(1990, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        "Masculino",
        email,
        "1122334455",
        "Calle Falsa 123",
        "CABA",
        "Buenos Aires",
        categoriaPretendidaId,
        "Password#123");

    private static async Task<Categoria> SembrarCategoriaAsync(ApplicationDbContext dbContext, string nombre)
    {
        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = nombre, ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);
        await dbContext.SaveChangesAsync();
        return categoria;
    }

    private static Socio CrearSocio(Guid categoriaId, string dni, string email) => new()
    {
        Id = Guid.NewGuid(),
        UsuarioId = Guid.NewGuid(),
        NumeroSocio = "S000001",
        Apellido = "Existente",
        Nombres = "Socio",
        DNI = dni,
        Email = email,
        CategoriaId = categoriaId,
        Estado = EstadoSocio.Activo,
        CodigoQr = Guid.NewGuid().ToString("N"),
        FechaAlta = DateTime.UtcNow.AddYears(-1),
        FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
    };

    /// <summary>
    /// Arma un ServiceProvider real con Identity (AddIdentityCore + AddRoles +
    /// AddEntityFrameworkStores) contra un ApplicationDbContext InMemory, siembra los roles
    /// NoSocio/Socio que el servicio necesita, y devuelve todo lo que los tests necesitan
    /// inspeccionar. Se descarta (DisposeAsync) el ServiceProvider junto con el DbContext al
    /// final de cada test.
    /// </summary>
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
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        var provider = services.BuildServiceProvider();

        var dbContext = provider.GetRequiredService<ApplicationDbContext>();
        var userManager = provider.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = provider.GetRequiredService<RoleManager<ApplicationRole>>();

        var rolNoSocio = await CrearRolAsync(roleManager, "NoSocio");
        var rolSocio = await CrearRolAsync(roleManager, "Socio");

        var servicio = new SolicitudMembresiaService(dbContext, userManager, roleManager);

        return new ContextoDeTest(provider, dbContext, userManager, servicio, rolNoSocio, rolSocio);
    }

    private static async Task<ApplicationRole> CrearRolAsync(RoleManager<ApplicationRole> roleManager, string nombre)
    {
        var rol = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = nombre,
            NivelJerarquico = 4,
            EsRolDeSistema = true,
            Estado = EstadoRol.Activo
        };

        (await roleManager.CreateAsync(rol)).Succeeded.Should().BeTrue();
        return rol;
    }

    private sealed class ContextoDeTest : IAsyncDisposable
    {
        public ContextoDeTest(
            ServiceProvider provider,
            ApplicationDbContext dbContext,
            UserManager<ApplicationUser> userManager,
            SolicitudMembresiaService servicio,
            ApplicationRole rolNoSocio,
            ApplicationRole rolSocio)
        {
            Provider = provider;
            DbContext = dbContext;
            UserManager = userManager;
            Servicio = servicio;
            RolNoSocio = rolNoSocio;
            RolSocio = rolSocio;
        }

        public ServiceProvider Provider { get; }

        public ApplicationDbContext DbContext { get; }

        public UserManager<ApplicationUser> UserManager { get; }

        public SolicitudMembresiaService Servicio { get; }

        public ApplicationRole RolNoSocio { get; }

        public ApplicationRole RolSocio { get; }

        public async ValueTask DisposeAsync()
        {
            await DbContext.DisposeAsync();
            await Provider.DisposeAsync();
        }
    }
}
