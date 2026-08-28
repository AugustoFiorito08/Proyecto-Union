using System.Diagnostics;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.API.Controllers;
using ProyectoUnion.Application.Dtos.Cuotas;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Prueba de carga (SPEC.md §6, Etapa 7 — "pruebas de carga sobre generación batch de
/// cuotas...", alcance concreto definido en la conversación de la tarea, no en SPEC.md) sobre
/// <see cref="CuotasController.GenerarPeriodo"/>: siembra ~5.000 Socios individuales Activos
/// contra Postgres REAL (no InMemory — el objetivo es medir el motor de queries real de EF
/// Core + Npgsql, no una estructura en memoria) y cronometra la llamada al batch completo.
///
/// Decisión de diseño: se instancia <see cref="CuotasController"/> directamente contra el
/// mismo <see cref="ApplicationDbContext"/> de siembra (mismo patrón que
/// <c>ReportesControllerTests</c>/<c>MoraSuspensionServiceTests</c> ya usan en este repo para
/// tests de integración), en lugar de pegarle por HTTP a la API en :5000. Esto mide el costo
/// real de EF Core + Npgsql (que es lo que la tarea pide medir — "generación batch de
/// cuotas"), sin mezclarlo con el overhead fijo del pipeline de ASP.NET Core (routing,
/// autenticación JWT, model binding), que es indepediente del tamaño del batch y no es lo que
/// esta prueba busca caracterizar.
///
/// Marcada con [Trait("Category", "LoadTest")] para quedar excluida de <c>dotnet test</c> sin
/// filtro (ver backend/loadtests/README.md) — no se ejecuta junto a la suite rápida existente.
/// </summary>
[Trait("Category", "LoadTest")]
public class CuotasBatchLoadTests : IAsyncLifetime
{
    // Valor de partida ajustable, NO es un SLA contractual — simplemente el umbral bajo el
    // cual esta prueba falla para llamar la atención si el batch se degrada gravemente. Se
    // puede subir/bajar libremente según el hardware donde corra.
    private const int UmbralMaximoSegundos = 15;

    private const int CantidadSocios = 5000;
    private const int TamanioLote = 500;

    // Período exclusivo de esta prueba: no debe haber sido usado antes en la DB de dev, para
    // no chocar con la idempotencia del batch (índice único filtrado Socio/Periodo). Todo lo
    // generado con este período se borra al final del test, sea de los Socios sembrados acá o
    // de cualquier Socio/GrupoFamiliar real preexistente que el batch también procese.
    private const string Periodo = "2027-01";

    // Prefijo para poder identificar y limpiar exactamente los Socios que sembró esta prueba,
    // sin tocar datos reales de la base de desarrollo.
    private const string PrefijoNumeroSocio = "LOADTEST-";

    private const string ConnectionString =
        "Host=localhost;Port=5433;Database=proyectounion;Username=postgres;Password=postgres";

    // Nombre del contenedor de la API en este entorno (ver docker-compose.yml, servicio
    // "api"; nombre real confirmado con "docker compose ps").
    private const string ApiContainerName = "proyecto-union-api-1";

    private ApplicationDbContext _dbContext = null!;
    private string _dataProtectionKeysDir = null!;

    public async Task InitializeAsync()
    {
        // El batch también hace Include(...) sobre GrupoFamiliar.TitularSocio/Integrantes
        // (Socios reales YA existentes en la base de dev), cuyos GrupoSanguineo/
        // ObservacionesMedicas están cifrados (RN-SEG-01) con el key ring PERSISTENTE de la
        // API (volumen Docker "dataprotection-keys", ver DependencyInjection.cs). Un
        // EphemeralDataProtectionProvider (clave nueva por proceso, como usan
        // MoraSuspensionServiceTests/ReportesControllerTests contra InMemory) no puede
        // descifrar esos datos reales y el batch tira CryptographicException. Se copia el key
        // ring real desde el contenedor de la API en vivo (docker cp) para poder descifrarlos.
        _dataProtectionKeysDir = await CopiarKeyRingDesdeContenedorApiAsync();

        _dbContext = CrearDbContext(_dataProtectionKeysDir);

        // Reutiliza una Categoría ya sembrada por DbSeeder (Etapa 1) en lugar de crear una
        // propia — evita tener que limpiarla también al final.
        var categoria = await _dbContext.Categorias.AsNoTracking().FirstOrDefaultAsync(c => c.Nombre == "Activo")
            ?? throw new InvalidOperationException(
                "No se encontró la Categoría \"Activo\" sembrada por DbSeeder. ¿Está corriendo la API contra esta misma base al menos una vez para que el seed corra?");

        for (var loteInicio = 0; loteInicio < CantidadSocios; loteInicio += TamanioLote)
        {
            var loteFin = Math.Min(loteInicio + TamanioLote, CantidadSocios);
            var lote = new List<Socio>(loteFin - loteInicio);

            for (var i = loteInicio; i < loteFin; i++)
            {
                lote.Add(new Socio
                {
                    Id = Guid.NewGuid(),
                    NumeroSocio = $"{PrefijoNumeroSocio}{i:D6}",
                    Apellido = "CargaDePrueba",
                    Nombres = $"Socio {i:D6}",
                    DNI = $"90{i:D6}",
                    FechaNacimiento = DateTime.SpecifyKind(new DateTime(1990, 1, 1), DateTimeKind.Utc),
                    TipoPago = TipoPago.Mensual,
                    CategoriaId = categoria.Id,
                    Email = $"loadtest.socio.{i:D6}@clubunion.local",
                    Estado = EstadoSocio.Activo,
                    GrupoFamiliarId = null,
                    CodigoQr = Guid.NewGuid().ToString("N"),
                    FechaAlta = DateTime.UtcNow,
                    FechaUltimaModificacion = DateTime.UtcNow
                });
            }

            _dbContext.Socios.AddRange(lote);
            await _dbContext.SaveChangesAsync();

            // Libera el change tracker entre lotes: sembrar 5.000 entidades trackeadas a la
            // vez infla el costo de SaveChanges de forma innecesaria para lo que esta prueba
            // quiere medir (el batch de generación, no la siembra).
            _dbContext.ChangeTracker.Clear();
        }
    }

    [Fact]
    public async Task GenerarPeriodo_Con5000SociosIndividualesActivos_CompletaDentroDelUmbral()
    {
        var controller = new CuotasController(_dbContext);

        var cronometro = Stopwatch.StartNew();
        var resultado = await controller.GenerarPeriodo(new GenerarPeriodoRequest(Periodo), CancellationToken.None);
        cronometro.Stop();

        Console.WriteLine(
            $"[CuotasBatchLoadTests] GenerarPeriodo con {CantidadSocios} Socios individuales sembrados " +
            $"tardó {cronometro.Elapsed.TotalSeconds:F2}s (umbral de partida: {UmbralMaximoSegundos}s).");

        var response = (resultado.Result as Microsoft.AspNetCore.Mvc.OkObjectResult)?.Value as GenerarPeriodoResponse;
        response.Should().NotBeNull();

        // >= en lugar de == : el batch también procesa cualquier Socio individual Activo y
        // GrupoFamiliar Activo preexistente en la base de dev (fuera del control de esta
        // prueba), que se limpia igual al final por Periodo.
        response!.Generadas.Should().BeGreaterThanOrEqualTo(CantidadSocios);

        cronometro.Elapsed.TotalSeconds.Should().BeLessThan(
            UmbralMaximoSegundos,
            $"la generación batch de {CantidadSocios} cuotas no debería degradarse por encima del umbral de partida de {UmbralMaximoSegundos}s");
    }

    public async Task DisposeAsync()
    {
        try
        {
            // Cascade delete (CuotaDetalleConfiguration) se encarga de los CuotaDetalle al
            // borrar la Cuota. Primero Cuotas (por Periodo, exclusivo de esta prueba) y recién
            // después Socios (Cuota.SocioId es Restrict, no se puede borrar el Socio con
            // Cuotas vigentes apuntándole).
            await _dbContext.Cuotas.Where(c => c.Periodo == Periodo).ExecuteDeleteAsync();
            await _dbContext.Socios.Where(s => s.NumeroSocio.StartsWith(PrefijoNumeroSocio)).ExecuteDeleteAsync();
        }
        finally
        {
            await _dbContext.DisposeAsync();

            if (!string.IsNullOrEmpty(_dataProtectionKeysDir) && Directory.Exists(_dataProtectionKeysDir))
            {
                Directory.Delete(_dataProtectionKeysDir, recursive: true);
            }
        }
    }

    /// <summary>
    /// Copia el key ring real de Data Protection desde el contenedor de la API en vivo (vía
    /// "docker cp", sin credenciales ni exposición de puertos adicionales) a un directorio
    /// temporal local, para poder instanciar un <see cref="IDataProtectionProvider"/> capaz de
    /// descifrar datos ya persistidos por la API real.
    /// </summary>
    private static async Task<string> CopiarKeyRingDesdeContenedorApiAsync()
    {
        var destino = Path.Combine(Path.GetTempPath(), $"proyectounion-dp-keys-{Guid.NewGuid():N}");
        Directory.CreateDirectory(destino);

        var proceso = Process.Start(new ProcessStartInfo
        {
            FileName = "docker",
            ArgumentList = { "cp", $"{ApiContainerName}:/app/dataprotection-keys/.", destino },
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        }) ?? throw new InvalidOperationException("No se pudo iniciar el proceso \"docker\".");

        var stderr = await proceso.StandardError.ReadToEndAsync();
        await proceso.WaitForExitAsync();

        if (proceso.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"\"docker cp\" del key ring de Data Protection falló (código {proceso.ExitCode}). " +
                $"¿Está corriendo el contenedor \"{ApiContainerName}\" (docker compose up -d)? Detalle: {stderr}");
        }

        return destino;
    }

    private static ApplicationDbContext CrearDbContext(string dataProtectionKeysDir)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(ConnectionString)
            .Options;

        // Mismo "purpose"/ApplicationName que la API real (DependencyInjection.cs) para que
        // las claves calcen y se pueda descifrar lo que la API ya persistió.
        var dataProtectionProvider = DataProtectionProvider.Create(
            new DirectoryInfo(dataProtectionKeysDir),
            builder => builder.SetApplicationName("ProyectoUnion"));

        return new ApplicationDbContext(options, dataProtectionProvider);
    }
}
