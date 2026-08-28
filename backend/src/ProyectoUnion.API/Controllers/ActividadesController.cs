using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Dtos.Actividades;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Instructores;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Actividades, Divisiones Deportivas e Inscripciones (SPEC.md §5 "Actividades",
/// §4.2 "Actividad"/"DivisionDeportiva"/"Inscripcion"). Aplica RF-ACT-24 bis/RN-ACT-02
/// (§3.17: instructor obligatorio para activar) y control de cupo (§5).
/// </summary>
[ApiController]
[Route("api/actividades")]
[Authorize]
public class ActividadesController : ControllerBase
{
    private readonly ApplicationDbContext _dbContext;

    public ActividadesController(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    [Authorize(Policy = "actividades.leer")]
    public async Task<ActionResult<PagedResult<ActividadResponse>>> Listar(
        [FromQuery] string? nombre,
        [FromQuery] Guid? categoriaId,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = ActividadesConIncludes();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var texto = nombre.Trim();
            query = query.Where(a => a.Nombre.Contains(texto));
        }

        if (categoriaId.HasValue)
        {
            query = query.Where(a => a.CategoriaId == categoriaId.Value);
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoActividad)estado.Value;
            query = query.Where(a => a.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var actividades = await query
            .OrderBy(a => a.Nombre)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = new List<ActividadResponse>();
        foreach (var actividad in actividades)
        {
            items.Add(await MapearAResponseAsync(actividad, cancellationToken));
        }

        return Ok(new PagedResult<ActividadResponse>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "actividades.leer")]
    public async Task<ActionResult<ActividadResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var actividad = await ActividadesConIncludes().FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        return Ok(await MapearAResponseAsync(actividad, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = "actividades.crear")]
    public async Task<ActionResult<ActividadResponse>> Crear([FromBody] CrearActividadRequest request, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Categorias.AnyAsync(c => c.Id == request.CategoriaId, cancellationToken))
        {
            return BadRequest(new { message = "La categoría indicada no existe." });
        }

        if (request.EspacioId.HasValue && !await _dbContext.Espacios.AnyAsync(e => e.Id == request.EspacioId.Value, cancellationToken))
        {
            return BadRequest(new { message = "El espacio indicado no existe." });
        }

        var actividad = new Actividad
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre,
            Descripcion = request.Descripcion,
            CategoriaId = request.CategoriaId,
            EspacioId = request.EspacioId,
            Precio = request.Precio,
            ModalidadInscripcion = (ModalidadInscripcion)request.ModalidadInscripcion,
            CupoMinimo = request.CupoMinimo,
            CupoMaximo = request.CupoMaximo,
            Dias = request.Dias,
            HorarioInicio = request.HorarioInicio,
            HorarioFin = request.HorarioFin,
            Duracion = request.Duracion,
            Estado = EstadoActividad.Suspendida,
            ImagenUrl = request.ImagenUrl,
            FechaUltimaModificacion = DateTime.UtcNow
        };

        // RF-ACT-24 bis / RN-ACT-02 (SPEC.md §3.17): recién creada no puede tener
        // instructores asignados todavía (se asignan vía PUT .../instructores), así que
        // pedir Estado=Activa en el alta siempre fallaría esta validación — es esperado.
        if ((EstadoActividad)request.Estado == EstadoActividad.Activa)
        {
            return Conflict(new
            {
                message = "No se puede crear la actividad ya Activa: asigne al menos un instructor " +
                           "(PUT /api/actividades/{id}/instructores) y luego actívela con PUT /api/actividades/{id}."
            });
        }

        actividad.Estado = (EstadoActividad)request.Estado;

        _dbContext.Actividades.Add(actividad);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var actividadCreada = await ActividadesConIncludes().FirstAsync(a => a.Id == actividad.Id, cancellationToken);
        var response = await MapearAResponseAsync(actividadCreada, cancellationToken);
        return CreatedAtAction(nameof(Obtener), new { id = actividad.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<ActionResult<ActividadResponse>> Actualizar(Guid id, [FromBody] ActualizarActividadRequest request, CancellationToken cancellationToken)
    {
        var actividad = await _dbContext.Actividades.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        if (!await _dbContext.Categorias.AnyAsync(c => c.Id == request.CategoriaId, cancellationToken))
        {
            return BadRequest(new { message = "La categoría indicada no existe." });
        }

        if (request.EspacioId.HasValue && !await _dbContext.Espacios.AnyAsync(e => e.Id == request.EspacioId.Value, cancellationToken))
        {
            return BadRequest(new { message = "El espacio indicado no existe." });
        }

        var nuevoEstado = (EstadoActividad)request.Estado;
        if (nuevoEstado == EstadoActividad.Activa && actividad.Estado != EstadoActividad.Activa)
        {
            var error = await ValidarInstructorObligatorioAsync(id, cancellationToken);
            if (error is not null)
            {
                return Conflict(new { message = error });
            }
        }

        actividad.Nombre = request.Nombre;
        actividad.Descripcion = request.Descripcion;
        actividad.CategoriaId = request.CategoriaId;
        actividad.EspacioId = request.EspacioId;
        actividad.Precio = request.Precio;
        actividad.ModalidadInscripcion = (ModalidadInscripcion)request.ModalidadInscripcion;
        actividad.CupoMinimo = request.CupoMinimo;
        actividad.CupoMaximo = request.CupoMaximo;
        actividad.Dias = request.Dias;
        actividad.HorarioInicio = request.HorarioInicio;
        actividad.HorarioFin = request.HorarioFin;
        actividad.Duracion = request.Duracion;
        actividad.Estado = nuevoEstado;
        actividad.ImagenUrl = request.ImagenUrl;
        actividad.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var actividadActualizada = await ActividadesConIncludes().FirstAsync(a => a.Id == id, cancellationToken);
        return Ok(await MapearAResponseAsync(actividadActualizada, cancellationToken));
    }

    /// <summary>
    /// Transición liviana de estado (SPEC.md, mismo patrón que `SociosController.CambiarEstado`)
    /// — separada de `Actualizar` para no forzar al frontend a reenviar los ~13 campos de la
    /// actividad solo para activar/suspender. Valida RN-ACT-02 al pasar a Activa.
    /// </summary>
    [HttpPut("{id:guid}/estado")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<IActionResult> CambiarEstado(Guid id, [FromBody] CambiarEstadoActividadRequest request, CancellationToken cancellationToken)
    {
        var actividad = await _dbContext.Actividades.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        if (!Enum.IsDefined(typeof(EstadoActividad), request.Estado))
        {
            return BadRequest(new { message = "Estado inválido." });
        }

        var nuevoEstado = (EstadoActividad)request.Estado;
        if (nuevoEstado == EstadoActividad.Activa && actividad.Estado != EstadoActividad.Activa)
        {
            var error = await ValidarInstructorObligatorioAsync(id, cancellationToken);
            if (error is not null)
            {
                return Conflict(new { message = error });
            }
        }

        actividad.Estado = nuevoEstado;
        actividad.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "actividades.baja")]
    public async Task<IActionResult> Baja(Guid id, [FromBody] BajaActividadRequest request, CancellationToken cancellationToken)
    {
        var actividad = await _dbContext.Actividades.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        // BajaActividadRequest.Motivo se acepta por convención de contrato (body { Motivo })
        // pero no se persiste — ver comentario en el DTO.
        _ = request.Motivo;

        actividad.Estado = EstadoActividad.Finalizada;
        actividad.FechaUltimaModificacion = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // ---- Instructores (N:M, RN-ACT-02 §3.17) ----

    [HttpPut("{id:guid}/instructores")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<ActionResult<ActividadResponse>> AsignarInstructores(Guid id, [FromBody] AsignarInstructoresRequest request, CancellationToken cancellationToken)
    {
        var actividad = await _dbContext.Actividades.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        var instructorIds = request.InstructorIds.Distinct().ToList();
        if (instructorIds.Count > 0)
        {
            var existentes = await _dbContext.Instructores.CountAsync(i => instructorIds.Contains(i.Id), cancellationToken);
            if (existentes != instructorIds.Count)
            {
                return BadRequest(new { message = "Uno o más instructores indicados no existen." });
            }
        }

        var actuales = await _dbContext.ActividadInstructores.Where(ai => ai.ActividadId == id).ToListAsync(cancellationToken);
        _dbContext.ActividadInstructores.RemoveRange(actuales);

        foreach (var instructorId in instructorIds)
        {
            _dbContext.ActividadInstructores.Add(new ActividadInstructor { ActividadId = id, InstructorId = instructorId });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var actividadActualizada = await ActividadesConIncludes().FirstAsync(a => a.Id == id, cancellationToken);
        return Ok(await MapearAResponseAsync(actividadActualizada, cancellationToken));
    }

    // ---- Divisiones deportivas (SPEC.md §4.2 "DivisionDeportiva", RN-ACT-02 §3.17) ----

    [HttpGet("{id:guid}/divisiones")]
    [Authorize(Policy = "actividades.leer")]
    public async Task<ActionResult<IReadOnlyList<DivisionResponse>>> ListarDivisiones(Guid id, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Actividades.AnyAsync(a => a.Id == id, cancellationToken))
        {
            return NotFound();
        }

        var divisiones = await _dbContext.DivisionesDeportivas
            .AsNoTracking()
            .Include(d => d.DivisionInstructores).ThenInclude(di => di.Instructor)
            .Where(d => d.ActividadId == id)
            .OrderBy(d => d.Nombre)
            .ToListAsync(cancellationToken);

        return Ok(divisiones.Select(MapearDivisionAResponse).ToList());
    }

    [HttpPost("{id:guid}/divisiones")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<ActionResult<DivisionResponse>> CrearDivision(Guid id, [FromBody] CrearDivisionRequest request, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Actividades.AnyAsync(a => a.Id == id, cancellationToken))
        {
            return NotFound();
        }

        var division = new DivisionDeportiva
        {
            Id = Guid.NewGuid(),
            ActividadId = id,
            Nombre = request.Nombre,
            EdadMinima = request.EdadMinima,
            EdadMaxima = request.EdadMaxima,
            Genero = request.Genero,
            Dias = request.Dias,
            HorarioInicio = request.HorarioInicio,
            HorarioFin = request.HorarioFin,
            Estado = (EstadoDivisionDeportiva)request.Estado
        };

        _dbContext.DivisionesDeportivas.Add(division);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(ListarDivisiones), new { id }, MapearDivisionAResponse(division));
    }

    [HttpPut("{id:guid}/divisiones/{divisionId:guid}")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<ActionResult<DivisionResponse>> ActualizarDivision(Guid id, Guid divisionId, [FromBody] ActualizarDivisionRequest request, CancellationToken cancellationToken)
    {
        var division = await _dbContext.DivisionesDeportivas
            .Include(d => d.DivisionInstructores).ThenInclude(di => di.Instructor)
            .FirstOrDefaultAsync(d => d.Id == divisionId && d.ActividadId == id, cancellationToken);
        if (division is null)
        {
            return NotFound();
        }

        division.Nombre = request.Nombre;
        division.EdadMinima = request.EdadMinima;
        division.EdadMaxima = request.EdadMaxima;
        division.Genero = request.Genero;
        division.Dias = request.Dias;
        division.HorarioInicio = request.HorarioInicio;
        division.HorarioFin = request.HorarioFin;
        division.Estado = (EstadoDivisionDeportiva)request.Estado;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapearDivisionAResponse(division));
    }

    [HttpPut("{id:guid}/divisiones/{divisionId:guid}/instructores")]
    [Authorize(Policy = "actividades.editar")]
    public async Task<ActionResult<DivisionResponse>> AsignarInstructoresDivision(Guid id, Guid divisionId, [FromBody] AsignarInstructoresRequest request, CancellationToken cancellationToken)
    {
        var division = await _dbContext.DivisionesDeportivas.FirstOrDefaultAsync(d => d.Id == divisionId && d.ActividadId == id, cancellationToken);
        if (division is null)
        {
            return NotFound();
        }

        var instructorIds = request.InstructorIds.Distinct().ToList();
        if (instructorIds.Count > 0)
        {
            var existentes = await _dbContext.Instructores.CountAsync(i => instructorIds.Contains(i.Id), cancellationToken);
            if (existentes != instructorIds.Count)
            {
                return BadRequest(new { message = "Uno o más instructores indicados no existen." });
            }
        }

        var actuales = await _dbContext.DivisionInstructores.Where(di => di.DivisionDeportivaId == divisionId).ToListAsync(cancellationToken);
        _dbContext.DivisionInstructores.RemoveRange(actuales);

        foreach (var instructorId in instructorIds)
        {
            _dbContext.DivisionInstructores.Add(new DivisionInstructor { DivisionDeportivaId = divisionId, InstructorId = instructorId });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var divisionActualizada = await _dbContext.DivisionesDeportivas
            .Include(d => d.DivisionInstructores).ThenInclude(di => di.Instructor)
            .FirstAsync(d => d.Id == divisionId, cancellationToken);

        return Ok(MapearDivisionAResponse(divisionActualizada));
    }

    // ---- Inscripciones (SPEC.md §4.2 "Inscripcion") ----

    [HttpGet("{id:guid}/inscriptos")]
    [Authorize(Policy = "actividades.leer")]
    public async Task<ActionResult<IReadOnlyList<InscripcionResponse>>> ListarInscriptos(Guid id, CancellationToken cancellationToken)
    {
        if (!await _dbContext.Actividades.AnyAsync(a => a.Id == id, cancellationToken))
        {
            return NotFound();
        }

        var inscripciones = await _dbContext.Inscripciones
            .AsNoTracking()
            .Include(i => i.Socio)
            .Include(i => i.Actividad)
            .Include(i => i.DivisionDeportiva)
            .Where(i => i.ActividadId == id)
            .OrderBy(i => i.Socio.Apellido).ThenBy(i => i.Socio.Nombres)
            .ToListAsync(cancellationToken);

        return Ok(inscripciones.Select(MapearInscripcionAResponse).ToList());
    }

    [HttpPost("{id:guid}/inscripciones")]
    [Authorize(Policy = "actividades.crear")]
    public async Task<ActionResult<InscripcionResponse>> Inscribir(Guid id, [FromBody] CrearInscripcionRequest request, CancellationToken cancellationToken)
    {
        var actividad = await _dbContext.Actividades.FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (actividad is null)
        {
            return NotFound();
        }

        if (!await _dbContext.Socios.AnyAsync(s => s.Id == request.SocioId, cancellationToken))
        {
            return BadRequest(new { message = "El socio indicado no existe." });
        }

        if (request.DivisionDeportivaId.HasValue &&
            !await _dbContext.DivisionesDeportivas.AnyAsync(d => d.Id == request.DivisionDeportivaId.Value && d.ActividadId == id, cancellationToken))
        {
            return BadRequest(new { message = "La división indicada no pertenece a esta actividad." });
        }

        var yaInscripto = await _dbContext.Inscripciones
            .AnyAsync(i => i.SocioId == request.SocioId && i.ActividadId == id && i.Estado == EstadoInscripcion.Activa, cancellationToken);
        if (yaInscripto)
        {
            return Conflict(new { message = "El socio ya está inscripto y activo en esta actividad." });
        }

        // Cupo (SPEC.md §5 "POST /api/actividades/{id}/inscripciones"): se cuenta contra
        // Actividad.CupoMaximo, acotado a la división si se inscribe a una puntual.
        var cupoQuery = _dbContext.Inscripciones.Where(i => i.ActividadId == id && i.Estado == EstadoInscripcion.Activa);
        cupoQuery = request.DivisionDeportivaId.HasValue
            ? cupoQuery.Where(i => i.DivisionDeportivaId == request.DivisionDeportivaId.Value)
            : cupoQuery;
        var ocupados = await cupoQuery.CountAsync(cancellationToken);
        if (ocupados >= actividad.CupoMaximo)
        {
            return Conflict(new { message = "Se alcanzó el cupo máximo de la actividad." });
        }

        var inscripcion = new Inscripcion
        {
            Id = Guid.NewGuid(),
            SocioId = request.SocioId,
            ActividadId = id,
            DivisionDeportivaId = request.DivisionDeportivaId,
            FechaInscripcion = DateTime.UtcNow,
            Estado = EstadoInscripcion.Activa
        };

        _dbContext.Inscripciones.Add(inscripcion);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var inscripcionCreada = await _dbContext.Inscripciones
            .Include(i => i.Socio)
            .Include(i => i.Actividad)
            .Include(i => i.DivisionDeportiva)
            .FirstAsync(i => i.Id == inscripcion.Id, cancellationToken);

        return CreatedAtAction(nameof(ListarInscriptos), new { id }, MapearInscripcionAResponse(inscripcionCreada));
    }

    [HttpDelete("{id:guid}/inscripciones/{socioId:guid}")]
    [Authorize(Policy = "actividades.baja")]
    public async Task<IActionResult> CancelarInscripcion(Guid id, Guid socioId, CancellationToken cancellationToken)
    {
        var inscripcion = await _dbContext.Inscripciones
            .FirstOrDefaultAsync(i => i.ActividadId == id && i.SocioId == socioId && i.Estado == EstadoInscripcion.Activa, cancellationToken);
        if (inscripcion is null)
        {
            return NotFound(new { message = "El socio no tiene una inscripción activa en esta actividad." });
        }

        inscripcion.Estado = EstadoInscripcion.Cancelada;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private IQueryable<Actividad> ActividadesConIncludes() =>
        _dbContext.Actividades
            .AsNoTracking()
            .Include(a => a.Categoria)
            .Include(a => a.Espacio)
            .Include(a => a.ActividadInstructores).ThenInclude(ai => ai.Instructor);

    /// <summary>
    /// RF-ACT-24 bis / RN-ACT-02 (SPEC.md §3.17): al menos un ActividadInstructor (si la
    /// actividad no tiene divisiones) o al menos un DivisionInstructor por cada división
    /// activa (si las tiene).
    /// </summary>
    private async Task<string?> ValidarInstructorObligatorioAsync(Guid actividadId, CancellationToken cancellationToken)
    {
        var divisiones = await _dbContext.DivisionesDeportivas
            .Where(d => d.ActividadId == actividadId)
            .ToListAsync(cancellationToken);

        if (divisiones.Count == 0)
        {
            var tieneInstructor = await _dbContext.ActividadInstructores.AnyAsync(ai => ai.ActividadId == actividadId, cancellationToken);
            return tieneInstructor
                ? null
                : "La actividad no tiene divisiones deportivas: debe asignar al menos un instructor " +
                  "(PUT /api/actividades/{id}/instructores) antes de activarla.";
        }

        foreach (var division in divisiones.Where(d => d.Estado == EstadoDivisionDeportiva.Activa))
        {
            var tieneInstructor = await _dbContext.DivisionInstructores.AnyAsync(di => di.DivisionDeportivaId == division.Id, cancellationToken);
            if (!tieneInstructor)
            {
                return $"La división '{division.Nombre}' no tiene instructores asignados; asígnelos " +
                       "(PUT /api/actividades/{id}/divisiones/{divisionId}/instructores) antes de activar la actividad.";
            }
        }

        return null;
    }

    private async Task<ActividadResponse> MapearAResponseAsync(Actividad a, CancellationToken cancellationToken)
    {
        var cupoOcupado = await _dbContext.Inscripciones
            .CountAsync(i => i.ActividadId == a.Id && i.Estado == EstadoInscripcion.Activa, cancellationToken);

        return new ActividadResponse(
            a.Id,
            a.Nombre,
            a.Descripcion,
            a.CategoriaId,
            a.Categoria?.Nombre ?? string.Empty,
            a.EspacioId,
            a.Espacio?.Nombre,
            a.Precio,
            a.ModalidadInscripcion.ToString(),
            a.CupoMinimo,
            a.CupoMaximo,
            cupoOcupado,
            a.Dias,
            a.HorarioInicio,
            a.HorarioFin,
            a.Duracion,
            a.Estado.ToString(),
            a.ImagenUrl,
            a.FechaUltimaModificacion,
            a.ActividadInstructores
                .Select(ai => new InstructorResumenResponse(ai.InstructorId, $"{ai.Instructor.Apellido}, {ai.Instructor.Nombres}"))
                .ToList());
    }

    private static DivisionResponse MapearDivisionAResponse(DivisionDeportiva d) => new(
        d.Id,
        d.ActividadId,
        d.Nombre,
        d.EdadMinima,
        d.EdadMaxima,
        d.Genero,
        d.Dias,
        d.HorarioInicio,
        d.HorarioFin,
        d.Estado.ToString(),
        d.DivisionInstructores
            .Select(di => new InstructorResumenResponse(di.InstructorId, $"{di.Instructor.Apellido}, {di.Instructor.Nombres}"))
            .ToList());

    private static InscripcionResponse MapearInscripcionAResponse(Inscripcion i) => new(
        i.Id,
        i.SocioId,
        i.Socio is not null ? $"{i.Socio.Apellido}, {i.Socio.Nombres}" : string.Empty,
        i.ActividadId,
        i.Actividad?.Nombre ?? string.Empty,
        i.DivisionDeportivaId,
        i.DivisionDeportiva?.Nombre,
        i.FechaInscripcion,
        i.Estado.ToString());
}
