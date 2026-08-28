using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.API.Controllers;
using ProyectoUnion.Application.Dtos.Reportes;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (enunciado de la tarea, matriz §2.2 fila "Reportes generales"): 3 endpoints de
/// agregación de solo lectura sobre datos ya existentes. Usa el proveedor InMemory de EF Core
/// contra el ApplicationDbContext real, mismo criterio que ControlAccesoServiceTests —
/// se instancia el controller directamente (sin dependencias más allá del DbContext) y se
/// invoca la acción, ejerciendo la traducción real de las queries LINQ.
/// </summary>
public class ReportesControllerTests
{
    [Fact]
    public async Task Socios_ConSociosEnVariosEstadosYCategorias_DevuelveConteosCorrectos()
    {
        await using var dbContext = CrearDbContext();

        var categoriaActivos = await SembrarCategoriaAsync(dbContext, "Activos");
        var categoriaCadetes = await SembrarCategoriaAsync(dbContext, "Cadetes");

        // 2 Socios Activos (uno en cada categoría) + 1 Suspendido → PorEstado debe dar
        // Activo=2, Suspendido=1, Inactivo=0. PorCategoria (solo Activos) debe dar
        // Activos=1, Cadetes=1.
        var socioActivo1 = CrearSocio(categoriaActivos.Id, EstadoSocio.Activo);
        var socioActivo2 = CrearSocio(categoriaCadetes.Id, EstadoSocio.Activo);
        var socioSuspendido = CrearSocio(categoriaActivos.Id, EstadoSocio.Suspendido);
        dbContext.Socios.AddRange(socioActivo1, socioActivo2, socioSuspendido);

        // Cuota Vencida para socioActivo1 → debe contar como moroso; socioActivo2 no tiene
        // cuotas vencidas.
        dbContext.Cuotas.Add(new Cuota
        {
            Id = Guid.NewGuid(),
            SocioId = socioActivo1.Id,
            NumeroCuota = 1,
            Periodo = "2026-07",
            FechaVencimiento = DateTime.UtcNow.AddDays(-10),
            Importe = 15000m,
            Estado = EstadoCuota.Vencida
        });

        await dbContext.SaveChangesAsync();

        var controller = new ReportesController(dbContext);
        var resultado = await controller.Socios(CancellationToken.None);

        var response = ObtenerValor<ReporteSociosResponse>(resultado.Result);

        response.PorEstado.Should().ContainSingle(i => i.Estado == nameof(EstadoSocio.Activo) && i.Cantidad == 2);
        response.PorEstado.Should().ContainSingle(i => i.Estado == nameof(EstadoSocio.Suspendido) && i.Cantidad == 1);
        response.PorEstado.Should().ContainSingle(i => i.Estado == nameof(EstadoSocio.Inactivo) && i.Cantidad == 0);

        response.PorCategoria.Should().HaveCount(2);
        response.PorCategoria.Should().Contain(i => i.CategoriaId == categoriaActivos.Id && i.CategoriaNombre == "Activos" && i.Cantidad == 1);
        response.PorCategoria.Should().Contain(i => i.CategoriaId == categoriaCadetes.Id && i.CategoriaNombre == "Cadetes" && i.Cantidad == 1);

        response.SociosMorosos.Should().Be(1);
    }

    [Fact]
    public async Task Actividades_ConCupoYInscriptosActivos_CalculaPorcentajeDeOcupacion()
    {
        await using var dbContext = CrearDbContext();

        var categoria = await SembrarCategoriaAsync(dbContext, "General");

        // Actividad con CupoMaximo=10 y 3 inscriptos activos (+1 cancelada, que no debe
        // contar) → 30% de ocupación.
        var actividadConCupo = CrearActividad(categoria.Id, "Natación", cupoMaximo: 10);
        // Actividad con CupoMaximo=0 → debe devolver 0% en lugar de dividir por cero.
        var actividadSinCupo = CrearActividad(categoria.Id, "Taller libre", cupoMaximo: 0);
        // Actividad Suspendida → no debe aparecer en el reporte.
        var actividadSuspendida = CrearActividad(categoria.Id, "Yoga", cupoMaximo: 5);
        actividadSuspendida.Estado = EstadoActividad.Suspendida;

        dbContext.Actividades.AddRange(actividadConCupo, actividadSinCupo, actividadSuspendida);

        var socios = Enumerable.Range(1, 4)
            .Select(_ => CrearSocio(categoria.Id, EstadoSocio.Activo))
            .ToList();
        dbContext.Socios.AddRange(socios);

        dbContext.Inscripciones.AddRange(
            new Inscripcion { Id = Guid.NewGuid(), SocioId = socios[0].Id, ActividadId = actividadConCupo.Id, Estado = EstadoInscripcion.Activa },
            new Inscripcion { Id = Guid.NewGuid(), SocioId = socios[1].Id, ActividadId = actividadConCupo.Id, Estado = EstadoInscripcion.Activa },
            new Inscripcion { Id = Guid.NewGuid(), SocioId = socios[2].Id, ActividadId = actividadConCupo.Id, Estado = EstadoInscripcion.Activa },
            new Inscripcion { Id = Guid.NewGuid(), SocioId = socios[3].Id, ActividadId = actividadConCupo.Id, Estado = EstadoInscripcion.Cancelada });

        await dbContext.SaveChangesAsync();

        var controller = new ReportesController(dbContext);
        var resultado = await controller.Actividades(CancellationToken.None);

        var items = ObtenerValor<IReadOnlyList<ReporteActividadItemResponse>>(resultado.Result);

        items.Should().HaveCount(2);

        var conCupo = items.Single(i => i.ActividadId == actividadConCupo.Id);
        conCupo.InscriptosActivos.Should().Be(3);
        conCupo.PorcentajeOcupacion.Should().Be(30);

        var sinCupo = items.Single(i => i.ActividadId == actividadSinCupo.Id);
        sinCupo.PorcentajeOcupacion.Should().Be(0);

        items.Should().NotContain(i => i.ActividadId == actividadSuspendida.Id);
    }

    [Fact]
    public async Task Espacios_ConReservasDentroYFueraDelRango_SoloSumaLasDelRangoYEstadosValidos()
    {
        await using var dbContext = CrearDbContext();

        var espacioConReservas = CrearEspacio("Cancha 1");
        var espacioSinReservas = CrearEspacio("Salón de eventos");
        dbContext.Espacios.AddRange(espacioConReservas, espacioSinReservas);

        var desde = new DateTime(2026, 8, 1, 0, 0, 0, DateTimeKind.Utc);
        var hasta = new DateTime(2026, 8, 31, 0, 0, 0, DateTimeKind.Utc);

        // Dentro del rango, Confirmada → cuenta.
        dbContext.Reservas.Add(CrearReserva(espacioConReservas.Id, new DateTime(2026, 8, 10, 0, 0, 0, DateTimeKind.Utc), EstadoReserva.Confirmada, 5000m));
        // Dentro del rango, Pagada → cuenta.
        dbContext.Reservas.Add(CrearReserva(espacioConReservas.Id, new DateTime(2026, 8, 15, 0, 0, 0, DateTimeKind.Utc), EstadoReserva.Pagada, 3000m));
        // Dentro del rango, pero PendienteConfirmacion → NO cuenta.
        dbContext.Reservas.Add(CrearReserva(espacioConReservas.Id, new DateTime(2026, 8, 20, 0, 0, 0, DateTimeKind.Utc), EstadoReserva.PendienteConfirmacion, 1000m));
        // Fuera del rango (mes siguiente), Confirmada → NO cuenta.
        dbContext.Reservas.Add(CrearReserva(espacioConReservas.Id, new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc), EstadoReserva.Confirmada, 9999m));

        await dbContext.SaveChangesAsync();

        var controller = new ReportesController(dbContext);
        var resultado = await controller.Espacios(desde, hasta, CancellationToken.None);

        var items = ObtenerValor<IReadOnlyList<ReporteEspacioItemResponse>>(resultado.Result);

        items.Should().HaveCount(2);

        var conReservas = items.Single(i => i.EspacioId == espacioConReservas.Id);
        conReservas.CantidadReservas.Should().Be(2);
        conReservas.ImporteTotal.Should().Be(8000m);

        var sinReservas = items.Single(i => i.EspacioId == espacioSinReservas.Id);
        sinReservas.CantidadReservas.Should().Be(0);
        sinReservas.ImporteTotal.Should().Be(0m);
    }

    private static T ObtenerValor<T>(ActionResult? actionResult)
    {
        actionResult.Should().BeOfType<OkObjectResult>();
        return (T)((OkObjectResult)actionResult!).Value!;
    }

    private static async Task<Categoria> SembrarCategoriaAsync(ApplicationDbContext dbContext, string nombre)
    {
        var categoria = new Categoria { Id = Guid.NewGuid(), Nombre = nombre, ValorCuota = 15000m, Estado = EstadoCategoria.Activo };
        dbContext.Categorias.Add(categoria);
        await dbContext.SaveChangesAsync();
        return categoria;
    }

    private static Socio CrearSocio(Guid categoriaId, EstadoSocio estado) => new()
    {
        Id = Guid.NewGuid(),
        NumeroSocio = $"S{Guid.NewGuid():N}"[..8],
        Apellido = "Pérez",
        Nombres = "Juan",
        DNI = Guid.NewGuid().ToString("N")[..8],
        FechaNacimiento = new DateTime(1990, 1, 1),
        TipoPago = TipoPago.Mensual,
        CategoriaId = categoriaId,
        Email = $"{Guid.NewGuid():N}@test.local",
        Estado = estado,
        CodigoQr = Guid.NewGuid().ToString("N"),
        FechaAlta = DateTime.UtcNow.AddYears(-1),
        FechaUltimaModificacion = DateTime.UtcNow.AddYears(-1)
    };

    private static Actividad CrearActividad(Guid categoriaId, string nombre, int cupoMaximo) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = nombre,
        CategoriaId = categoriaId,
        ModalidadInscripcion = ModalidadInscripcion.HorarioFijo,
        CupoMinimo = 0,
        CupoMaximo = cupoMaximo,
        HorarioInicio = new TimeOnly(9, 0),
        HorarioFin = new TimeOnly(10, 0),
        Duracion = 60,
        Estado = EstadoActividad.Activa,
        FechaUltimaModificacion = DateTime.UtcNow
    };

    private static Espacio CrearEspacio(string nombre) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = nombre,
        Tipo = TipoEspacio.Deportivo,
        Capacidad = 20,
        Precio = 1000m,
        UnidadPrecio = UnidadPrecioEspacio.PorHora,
        Estado = EstadoEspacio.Activo,
        PoliticaCancelacionHoras = 24,
        PorcentajeReembolso = 0m
    };

    private static Reserva CrearReserva(Guid espacioId, DateTime fecha, EstadoReserva estado, decimal importe) => new()
    {
        Id = Guid.NewGuid(),
        EspacioId = espacioId,
        Fecha = fecha,
        HoraInicio = new TimeOnly(10, 0),
        HoraFin = new TimeOnly(11, 0),
        Duracion = 60,
        TipoReserva = TipoReserva.Partido,
        Estado = estado,
        Importe = importe,
        FechaCreacion = DateTime.UtcNow
    };

    private static ApplicationDbContext CrearDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options, new EphemeralDataProtectionProvider());
    }
}
