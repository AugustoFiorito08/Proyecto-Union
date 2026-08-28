using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Finanzas;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 3, enunciado punto 5 (RN-FIN-02, SPEC.md §3.2): Socio Activo con una Cuota Vencida
/// cuya antigüedad supera ConfiguracionGeneral.MaximaDeudaEnMeses → tras
/// ProcesarSuspensionesAsync queda Suspendido. Usa el proveedor InMemory de EF Core (no
/// requiere Postgres real) contra el ApplicationDbContext real, para ejercitar la consulta
/// completa, no solo lógica aislada.
/// </summary>
public class MoraSuspensionServiceTests
{
    [Fact]
    public async Task ProcesarSuspensionesAsync_ConCuotaVencidaMasAntiguaQueElMaximoTolerado_SuspendeAlSocio()
    {
        await using var dbContext = CrearDbContext();

        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);

        var socio = CrearSocio(categoria.Id);
        dbContext.Socios.Add(socio);

        dbContext.ConfiguracionesGenerales.Add(new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales
        });

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-01",
            // Vencida hace 5 meses > MaximaDeudaEnMeses (2) → debe suspender.
            FechaVencimiento = DateTime.UtcNow.AddMonths(-5),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var servicio = new MoraSuspensionService(dbContext);
        var suspendidos = await servicio.ProcesarSuspensionesAsync(CancellationToken.None);

        suspendidos.Should().Be(1);

        var socioActualizado = await dbContext.Socios.AsNoTracking().FirstAsync(s => s.Id == socio.Id);
        socioActualizado.Estado.Should().Be(EstadoSocio.Suspendido);
    }

    [Fact]
    public async Task ProcesarSuspensionesAsync_ConCuotaVencidaDentroDelToleradoAun_NoSuspende()
    {
        await using var dbContext = CrearDbContext();

        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);

        var socio = CrearSocio(categoria.Id);
        dbContext.Socios.Add(socio);

        dbContext.ConfiguracionesGenerales.Add(new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales
        });

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-06",
            // Vencida hace apenas 3 días: todavía dentro del margen de 2 meses tolerados.
            FechaVencimiento = DateTime.UtcNow.AddDays(-3),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var servicio = new MoraSuspensionService(dbContext);
        var suspendidos = await servicio.ProcesarSuspensionesAsync(CancellationToken.None);

        suspendidos.Should().Be(0);

        var socioActualizado = await dbContext.Socios.AsNoTracking().FirstAsync(s => s.Id == socio.Id);
        socioActualizado.Estado.Should().Be(EstadoSocio.Activo);
    }

    [Fact]
    public async Task ProcesarSuspensionesAsync_ConSocioYaSuspendido_NoLoCuentaDeNuevo()
    {
        await using var dbContext = CrearDbContext();

        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = "Activo", ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);

        var socio = CrearSocio(categoria.Id);
        socio.Estado = EstadoSocio.Suspendido;
        dbContext.Socios.Add(socio);

        dbContext.ConfiguracionesGenerales.Add(new ConfiguracionGeneral
        {
            Id = ConfiguracionGeneral.IdFijo,
            MaximaDeudaEnMeses = 2,
            TipoTarifaFamiliar = TipoTarifaFamiliar.SumaCategoriasIndividuales
        });

        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socio.Id,
            NumeroCuota = 1,
            Periodo = "2026-01",
            FechaVencimiento = DateTime.UtcNow.AddMonths(-5),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var servicio = new MoraSuspensionService(dbContext);
        var suspendidos = await servicio.ProcesarSuspensionesAsync(CancellationToken.None);

        suspendidos.Should().Be(0);
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
