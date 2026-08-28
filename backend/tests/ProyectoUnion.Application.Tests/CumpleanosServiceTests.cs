using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Tests.Fakes;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Comunicaciones;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;
using static ProyectoUnion.Application.Tests.Fakes.ComunicacionServiceTestHelpers;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 4 (RF-COM-24, SPEC.md §6): un Socio Activo con cuenta propia cuyo cumpleaños es hoy
/// recibe una Comunicacion tipo Cumpleanos; uno cuyo cumpleaños no es hoy, o sin cuenta
/// propia (UsuarioId null), no la recibe. Usa el proveedor InMemory de EF Core contra el
/// ApplicationDbContext real, mismo criterio que MoraSuspensionServiceTests (Etapa 3).
/// </summary>
public class CumpleanosServiceTests
{
    [Fact]
    public async Task ProcesarCumpleanosDelDiaAsync_ConSocioQueCumpleAniosHoy_LoNotifica()
    {
        await using var dbContext = CrearDbContext();

        var hoy = DateTime.UtcNow;
        var (categoria, rolSocio, usuarioSocio, socio) = CrearSocioConCuenta(hoy.AddYears(-30));
        SembrarSuperAdmin(dbContext);

        dbContext.Categorias.Add(categoria);
        dbContext.Roles.Add(rolSocio);
        dbContext.Users.Add(usuarioSocio);
        dbContext.Socios.Add(socio);
        await dbContext.SaveChangesAsync();

        var emailSender = new FakeEmailSender();
        var comunicacionService = CrearComunicacionServiceFake(dbContext, emailSender);
        var servicio = new CumpleanosService(dbContext, comunicacionService);

        var notificados = await servicio.ProcesarCumpleanosDelDiaAsync(CancellationToken.None);

        notificados.Should().Be(1);
        emailSender.Enviados.Should().ContainSingle(e => e.Destinatario == usuarioSocio.Email);

        var comunicacion = await dbContext.Comunicaciones.AsNoTracking().SingleAsync();
        comunicacion.TipoComunicacion.Should().Be(TipoComunicacion.Cumpleanos);
        comunicacion.Estado.Should().Be(EstadoComunicacion.Enviada);
    }

    [Fact]
    public async Task ProcesarCumpleanosDelDiaAsync_ConSocioQueNoCumpleAniosHoy_NoLoNotifica()
    {
        await using var dbContext = CrearDbContext();

        var otroDia = DateTime.UtcNow.AddMonths(3);
        var (categoria, rolSocio, usuarioSocio, socio) = CrearSocioConCuenta(otroDia.AddYears(-30));
        SembrarSuperAdmin(dbContext);

        dbContext.Categorias.Add(categoria);
        dbContext.Roles.Add(rolSocio);
        dbContext.Users.Add(usuarioSocio);
        dbContext.Socios.Add(socio);
        await dbContext.SaveChangesAsync();

        var comunicacionService = CrearComunicacionServiceFake(dbContext);
        var servicio = new CumpleanosService(dbContext, comunicacionService);

        var notificados = await servicio.ProcesarCumpleanosDelDiaAsync(CancellationToken.None);

        notificados.Should().Be(0);
        (await dbContext.Comunicaciones.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task ProcesarCumpleanosDelDiaAsync_ConSocioSinCuentaPropia_NoLoNotifica()
    {
        await using var dbContext = CrearDbContext();

        var hoy = DateTime.UtcNow;
        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        var socio = new Socio
        {
            Id = Guid.NewGuid(),
            UsuarioId = null,
            NumeroSocio = "S000002",
            Apellido = "Gómez",
            Nombres = "Ana",
            DNI = "30111333",
            Email = "ana.gomez@clubunion.local",
            CategoriaId = categoria.Id,
            Estado = EstadoSocio.Activo,
            CodigoQr = Guid.NewGuid().ToString("N"),
            FechaNacimiento = hoy.AddYears(-25),
            FechaAlta = DateTime.UtcNow.AddYears(-1),
            FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
        };

        SembrarSuperAdmin(dbContext);
        dbContext.Categorias.Add(categoria);
        dbContext.Socios.Add(socio);
        await dbContext.SaveChangesAsync();

        var comunicacionService = CrearComunicacionServiceFake(dbContext);
        var servicio = new CumpleanosService(dbContext, comunicacionService);

        var notificados = await servicio.ProcesarCumpleanosDelDiaAsync(CancellationToken.None);

        notificados.Should().Be(0);
    }

    private static (Categoria Categoria, ApplicationRole RolSocio, ApplicationUser UsuarioSocio, Socio Socio) CrearSocioConCuenta(DateTime fechaNacimiento)
    {
        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };

        var rolSocio = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = "Socio",
            NormalizedName = "SOCIO",
            NivelJerarquico = 4,
            EsRolDeSistema = true,
            Estado = EstadoRol.Activo
        };

        var usuarioSocio = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = "socio.cumple@clubunion.local",
            NormalizedUserName = "SOCIO.CUMPLE@CLUBUNION.LOCAL",
            Email = "socio.cumple@clubunion.local",
            NormalizedEmail = "SOCIO.CUMPLE@CLUBUNION.LOCAL",
            EmailConfirmed = true,
            RolId = rolSocio.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        var socio = new Socio
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioSocio.Id,
            NumeroSocio = "S000001",
            Apellido = "Pérez",
            Nombres = "Juan",
            DNI = "30111222",
            Email = "juan.perez@clubunion.local",
            CategoriaId = categoria.Id,
            Estado = EstadoSocio.Activo,
            CodigoQr = Guid.NewGuid().ToString("N"),
            FechaNacimiento = fechaNacimiento,
            FechaAlta = DateTime.UtcNow.AddYears(-1),
            FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
        };

        return (categoria, rolSocio, usuarioSocio, socio);
    }

    /// <summary>
    /// ComunicacionService.CrearYEnviarASocioAsync atribuye las comunicaciones automáticas
    /// (sin usuario staff detrás) al SuperAdministrador sembrado (ver
    /// ComunicacionService.ResolverUsuarioSistemaAsync) — se siembra un usuario con el mismo
    /// email que DbSeeder.SuperAdminEmail para que la resolución encuentre un creador válido.
    /// </summary>
    private static void SembrarSuperAdmin(ApplicationDbContext dbContext)
    {
        var rolSuperAdmin = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = "SuperAdministrador",
            NormalizedName = "SUPERADMINISTRADOR",
            NivelJerarquico = 1,
            EsRolDeSistema = true,
            Estado = EstadoRol.Activo
        };

        var superAdmin = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = DbSeeder.SuperAdminEmail,
            NormalizedUserName = DbSeeder.SuperAdminEmail.ToUpperInvariant(),
            Email = DbSeeder.SuperAdminEmail,
            NormalizedEmail = DbSeeder.SuperAdminEmail.ToUpperInvariant(),
            EmailConfirmed = true,
            RolId = rolSuperAdmin.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        dbContext.Roles.Add(rolSuperAdmin);
        dbContext.Users.Add(superAdmin);
    }

    private static ApplicationDbContext CrearDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, new EphemeralDataProtectionProvider());
    }
}
