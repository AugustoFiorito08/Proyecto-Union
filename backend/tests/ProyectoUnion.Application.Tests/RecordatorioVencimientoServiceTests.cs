using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ProyectoUnion.Application.Tests.Fakes;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Comunicaciones;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;
using static ProyectoUnion.Application.Tests.Fakes.ComunicacionServiceTestHelpers;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 4 (RF-COM-26, SPEC.md §6): una Cuota Pendiente cuyo vencimiento cae dentro de la
/// anticipación configurada dispara un recordatorio al Socio (o al titular, si es cuota
/// familiar); una segunda corrida no lo duplica (ver RecordatorioVencimientoService, marcador
/// embebido en el ContenidoHtml de la Comunicacion).
/// </summary>
public class RecordatorioVencimientoServiceTests
{
    [Fact]
    public async Task ProcesarRecordatoriosAsync_ConCuotaPendienteDentroDeLaAnticipacion_EnviaUnRecordatorio()
    {
        await using var dbContext = CrearDbContext();

        var (categoria, rolSocio, usuarioSocio, socio) = CrearSocioConCuenta();
        SembrarSuperAdmin(dbContext);
        dbContext.Categorias.Add(categoria);
        dbContext.Roles.Add(rolSocio);
        dbContext.Users.Add(usuarioSocio);
        dbContext.Socios.Add(socio);

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-09",
            FechaVencimiento = DateTime.UtcNow.AddDays(3), // dentro de los 5 días por defecto
            Importe = 15000m,
            Estado = EstadoCuota.Pendiente
        });

        await dbContext.SaveChangesAsync();

        var comunicacionService = CrearComunicacionServiceFake(dbContext);
        var servicio = new RecordatorioVencimientoService(dbContext, comunicacionService, CrearConfiguracionVacia());

        var enviados = await servicio.ProcesarRecordatoriosAsync(CancellationToken.None);

        enviados.Should().Be(1);
        var comunicacion = await dbContext.Comunicaciones.AsNoTracking().SingleAsync();
        comunicacion.TipoComunicacion.Should().Be(TipoComunicacion.Recordatorio);
    }

    [Fact]
    public async Task ProcesarRecordatoriosAsync_LlamadoDosVeces_NoDuplicaElRecordatorioDeLaMismaCuota()
    {
        await using var dbContext = CrearDbContext();

        var (categoria, rolSocio, usuarioSocio, socio) = CrearSocioConCuenta();
        SembrarSuperAdmin(dbContext);
        dbContext.Categorias.Add(categoria);
        dbContext.Roles.Add(rolSocio);
        dbContext.Users.Add(usuarioSocio);
        dbContext.Socios.Add(socio);

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-09",
            FechaVencimiento = DateTime.UtcNow.AddDays(3),
            Importe = 15000m,
            Estado = EstadoCuota.Pendiente
        });

        await dbContext.SaveChangesAsync();

        var comunicacionService = CrearComunicacionServiceFake(dbContext);
        var servicio = new RecordatorioVencimientoService(dbContext, comunicacionService, CrearConfiguracionVacia());

        var primeraCorrida = await servicio.ProcesarRecordatoriosAsync(CancellationToken.None);
        var segundaCorrida = await servicio.ProcesarRecordatoriosAsync(CancellationToken.None);

        primeraCorrida.Should().Be(1);
        segundaCorrida.Should().Be(0);
        (await dbContext.Comunicaciones.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task ProcesarRecordatoriosAsync_ConCuotaVencidaFueraDeLaAnticipacion_NoEnviaNada()
    {
        await using var dbContext = CrearDbContext();

        var (categoria, rolSocio, usuarioSocio, socio) = CrearSocioConCuenta();
        SembrarSuperAdmin(dbContext);
        dbContext.Categorias.Add(categoria);
        dbContext.Roles.Add(rolSocio);
        dbContext.Users.Add(usuarioSocio);
        dbContext.Socios.Add(socio);

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-09",
            FechaVencimiento = DateTime.UtcNow.AddDays(30), // fuera de los 5 días de anticipación
            Importe = 15000m,
            Estado = EstadoCuota.Pendiente
        });

        await dbContext.SaveChangesAsync();

        var comunicacionService = CrearComunicacionServiceFake(dbContext);
        var servicio = new RecordatorioVencimientoService(dbContext, comunicacionService, CrearConfiguracionVacia());

        var enviados = await servicio.ProcesarRecordatoriosAsync(CancellationToken.None);

        enviados.Should().Be(0);
    }

    private static (Categoria Categoria, ApplicationRole RolSocio, ApplicationUser UsuarioSocio, Socio Socio) CrearSocioConCuenta()
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
            UserName = "socio.recordatorio@clubunion.local",
            NormalizedUserName = "SOCIO.RECORDATORIO@CLUBUNION.LOCAL",
            Email = "socio.recordatorio@clubunion.local",
            NormalizedEmail = "SOCIO.RECORDATORIO@CLUBUNION.LOCAL",
            EmailConfirmed = true,
            RolId = rolSocio.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        var socio = new Socio
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuarioSocio.Id,
            NumeroSocio = "S000010",
            Apellido = "López",
            Nombres = "María",
            DNI = "30111444",
            Email = "maria.lopez@clubunion.local",
            CategoriaId = categoria.Id,
            Estado = EstadoSocio.Activo,
            CodigoQr = Guid.NewGuid().ToString("N"),
            FechaNacimiento = DateTime.UtcNow.AddYears(-40),
            FechaAlta = DateTime.UtcNow.AddYears(-1),
            FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
        };

        return (categoria, rolSocio, usuarioSocio, socio);
    }

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

    private static IConfiguration CrearConfiguracionVacia() => new ConfigurationBuilder().Build();

    private static ApplicationDbContext CrearDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, new EphemeralDataProtectionProvider());
    }
}
