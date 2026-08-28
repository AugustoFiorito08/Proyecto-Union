using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.ControlAcceso;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 5, enunciado punto 6 (RN-ACC-02/03/04, SPEC.md §3.1): cadena de validación de
/// ControlAccesoService en orden — QR reconocido, Estado del Socio, mora más allá de la
/// tolerancia, vigencia de Ficha Médica — cortando en la primera que falla, y registrando
/// siempre la fila correspondiente en RegistroAcceso. Usa el proveedor InMemory de EF Core
/// (no requiere Postgres real) contra el ApplicationDbContext real, mismo criterio que
/// MoraSuspensionServiceTests/CumpleanosServiceTests.
/// </summary>
public class ControlAccesoServiceTests
{
    private static readonly Guid OperadorUsuarioId = Guid.NewGuid();

    [Fact]
    public async Task ValidarAsync_ConQrInexistente_DeniegaYRegistraSinSocio()
    {
        await using var dbContext = CrearDbContext();
        var servicio = new ControlAccesoService(dbContext);

        var resultado = await servicio.ValidarAsync("qr-inexistente", OperadorUsuarioId, CancellationToken.None);

        resultado.Resultado.Should().Be("Denegado");
        resultado.MotivoDenegacion.Should().Be("QR no reconocido");
        resultado.SocioId.Should().BeNull();

        var registro = await dbContext.RegistrosAcceso.AsNoTracking().SingleAsync();
        registro.SocioId.Should().BeNull();
        registro.Resultado.Should().Be(ResultadoAcceso.Denegado);
        registro.MotivoDenegacion.Should().Be("QR no reconocido");
        registro.OperadorUsuarioId.Should().Be(OperadorUsuarioId);
    }

    [Fact]
    public async Task ValidarAsync_ConSocioSuspendido_Deniega()
    {
        await using var dbContext = CrearDbContext();

        var categoria = await SembrarCategoriaAsync(dbContext);
        var socio = CrearSocio(categoria.Id);
        socio.Estado = EstadoSocio.Suspendido;
        dbContext.Socios.Add(socio);
        SembrarConfiguracion(dbContext);
        await dbContext.SaveChangesAsync();

        var servicio = new ControlAccesoService(dbContext);
        var resultado = await servicio.ValidarAsync(socio.CodigoQr, OperadorUsuarioId, CancellationToken.None);

        resultado.Resultado.Should().Be("Denegado");
        resultado.MotivoDenegacion.Should().Be("Socio suspendido");
        resultado.SocioId.Should().Be(socio.Id);
        resultado.Apellido.Should().Be(socio.Apellido);

        var registro = await dbContext.RegistrosAcceso.AsNoTracking().SingleAsync();
        registro.SocioId.Should().Be(socio.Id);
        registro.Resultado.Should().Be(ResultadoAcceso.Denegado);
        registro.MotivoDenegacion.Should().Be("Socio suspendido");
    }

    [Fact]
    public async Task ValidarAsync_ConCuotaVencidaMasAlladeLaTolerancia_Deniega()
    {
        await using var dbContext = CrearDbContext();

        var categoria = await SembrarCategoriaAsync(dbContext);
        var socio = CrearSocio(categoria.Id);
        dbContext.Socios.Add(socio);
        SembrarConfiguracion(dbContext, toleranciaDias: 10);

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-06",
            // Vencida hace 20 días > tolerancia de 10 días → debe denegar.
            FechaVencimiento = DateTime.UtcNow.AddDays(-20),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var servicio = new ControlAccesoService(dbContext);
        var resultado = await servicio.ValidarAsync(socio.CodigoQr, OperadorUsuarioId, CancellationToken.None);

        resultado.Resultado.Should().Be("Denegado");
        resultado.MotivoDenegacion.Should().Be("Cuota vencida");

        var registro = await dbContext.RegistrosAcceso.AsNoTracking().SingleAsync();
        registro.MotivoDenegacion.Should().Be("Cuota vencida");
    }

    [Fact]
    public async Task ValidarAsync_ConFichaMedicaVencida_Deniega()
    {
        await using var dbContext = CrearDbContext();

        var categoria = await SembrarCategoriaAsync(dbContext);
        var socio = CrearSocio(categoria.Id);
        socio.FichaMedicaFechaEmision = DateTime.UtcNow.AddYears(-2);
        socio.FichaMedicaFechaVencimiento = DateTime.UtcNow.AddYears(-1); // vencida
        dbContext.Socios.Add(socio);
        SembrarConfiguracion(dbContext);
        await dbContext.SaveChangesAsync();

        var servicio = new ControlAccesoService(dbContext);
        var resultado = await servicio.ValidarAsync(socio.CodigoQr, OperadorUsuarioId, CancellationToken.None);

        resultado.Resultado.Should().Be("Denegado");
        resultado.MotivoDenegacion.Should().Be("Ficha médica vencida");

        var registro = await dbContext.RegistrosAcceso.AsNoTracking().SingleAsync();
        registro.MotivoDenegacion.Should().Be("Ficha médica vencida");
    }

    [Fact]
    public async Task ValidarAsync_ConTodasLasValidacionesEnRegla_Permite()
    {
        await using var dbContext = CrearDbContext();

        var categoria = await SembrarCategoriaAsync(dbContext);
        var socio = CrearSocio(categoria.Id);
        socio.FichaMedicaFechaEmision = DateTime.UtcNow.AddMonths(-1);
        socio.FichaMedicaFechaVencimiento = DateTime.UtcNow.AddMonths(11); // vigente
        dbContext.Socios.Add(socio);
        SembrarConfiguracion(dbContext);

        // Cuota pagada (no bloquea) más una cuota vencida pero dentro de la tolerancia.
        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-07",
            FechaVencimiento = DateTime.UtcNow.AddDays(-3),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var servicio = new ControlAccesoService(dbContext);
        var resultado = await servicio.ValidarAsync(socio.CodigoQr, OperadorUsuarioId, CancellationToken.None);

        resultado.Resultado.Should().Be("Permitido");
        resultado.MotivoDenegacion.Should().BeNull();
        resultado.SocioId.Should().Be(socio.Id);
        resultado.Apellido.Should().Be(socio.Apellido);
        resultado.Nombres.Should().Be(socio.Nombres);

        var registro = await dbContext.RegistrosAcceso.AsNoTracking().SingleAsync();
        registro.Resultado.Should().Be(ResultadoAcceso.Permitido);
        registro.MotivoDenegacion.Should().BeNull();
        registro.SocioId.Should().Be(socio.Id);
    }

    private static void SembrarConfiguracion(ApplicationDbContext dbContext, int toleranciaDias = 10)
    {
        dbContext.ConfiguracionesGenerales.Add(new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales,
            ToleranciaAccesoDiasCuotaVencida = toleranciaDias
        });
    }

    private static async Task<Categoria> SembrarCategoriaAsync(ApplicationDbContext dbContext)
    {
        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);
        await dbContext.SaveChangesAsync();
        return categoria;
    }

    private static Socio CrearSocio(Guid categoriaId) => new()
    {
        Id = Guid.NewGuid(),
        NumeroSocio = "S000001",
        Apellido = "Pérez",
        Nombres = "Juan",
        DNI = "30111222",
        Email = "juan.perez@clubunion.local",
        CategoriaId = categoriaId,
        Estado = EstadoSocio.Activo,
        CodigoQr = Guid.NewGuid().ToString("N"),
        FechaAlta = DateTime.UtcNow.AddYears(-1),
        FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
    };

    private static ApplicationDbContext CrearDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, new EphemeralDataProtectionProvider());
    }
}
