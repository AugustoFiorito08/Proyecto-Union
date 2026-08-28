using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Dtos.Common;
using ProyectoUnion.Application.Dtos.Instructores;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

/// <summary>
/// ABM de Instructores (SPEC.md §5, §4.2 "Instructor"). El alta
/// (<see cref="Crear"/>) crea además la cuenta de login asociada (rol "Instructor",
/// sembrado desde Etapa 0) con contraseña temporal (RN-LOG-01, §3.10).
/// </summary>
[ApiController]
[Route("api/instructores")]
[Authorize]
public class InstructoresController : ControllerBase
{
    private const string RolInstructor = "Instructor";

    private readonly ApplicationDbContext _dbContext;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<InstructoresController> _logger;

    public InstructoresController(
        ApplicationDbContext dbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IEmailSender emailSender,
        ILogger<InstructoresController> logger)
    {
        _dbContext = dbContext;
        _userManager = userManager;
        _roleManager = roleManager;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = "instructores.leer")]
    public async Task<ActionResult<PagedResult<InstructorResponse>>> Listar(
        [FromQuery] string? nombre,
        [FromQuery] int? estado,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 20 : pageSize;

        var query = _dbContext.Instructores.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            var texto = nombre.Trim();
            query = query.Where(i => i.Apellido.Contains(texto) || i.Nombres.Contains(texto));
        }

        if (estado.HasValue)
        {
            var estadoFiltro = (EstadoInstructor)estado.Value;
            query = query.Where(i => i.Estado == estadoFiltro);
        }

        var total = await query.CountAsync(cancellationToken);

        var instructores = await query
            .OrderBy(i => i.Apellido).ThenBy(i => i.Nombres)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = instructores.Select(MapearAResponse).ToList();

        return Ok(new PagedResult<InstructorResponse>(items, page, pageSize, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = "instructores.leer")]
    public async Task<ActionResult<InstructorResponse>> Obtener(Guid id, CancellationToken cancellationToken)
    {
        var instructor = await _dbContext.Instructores.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (instructor is null)
        {
            return NotFound();
        }

        return Ok(MapearAResponse(instructor));
    }

    [HttpPost]
    [Authorize(Policy = "instructores.crear")]
    public async Task<ActionResult<InstructorCreadoResponse>> Crear([FromBody] CrearInstructorRequest request, CancellationToken cancellationToken)
    {
        if (await _dbContext.Instructores.AnyAsync(i => i.DNI == request.DNI, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe un instructor con ese DNI." });
        }

        if (await _dbContext.Instructores.AnyAsync(i => i.Email == request.Email, cancellationToken) ||
            await _userManager.FindByEmailAsync(request.Email) is not null)
        {
            return BadRequest(new { message = "Ya existe un instructor o usuario con ese email." });
        }

        var rolInstructor = await _roleManager.FindByNameAsync(RolInstructor);
        if (rolInstructor is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                new { message = "El rol Instructor no está sembrado en el sistema." });
        }

        var passwordTemporal = TemporaryPasswordGenerator.Generar();

        var usuario = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            EmailConfirmed = true,
            RolId = rolInstructor.Id,
            Estado = EstadoUsuario.Activo,
            FechaCreacion = DateTime.UtcNow
        };

        var resultadoUsuario = await _userManager.CreateAsync(usuario, passwordTemporal);
        if (!resultadoUsuario.Succeeded)
        {
            return BadRequest(new { errors = resultadoUsuario.Errors.Select(e => e.Description) });
        }

        var instructor = new Instructor
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            Apellido = request.Apellido,
            Nombres = request.Nombres,
            DNI = request.DNI,
            Telefono = request.Telefono,
            Email = request.Email,
            Especialidad = request.Especialidad,
            Estado = EstadoInstructor.Activo
        };

        _dbContext.Instructores.Add(instructor);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Etapa 4: la contraseña temporal se envía por email (cerrado el TODO de Etapa 2);
        // solo viaja en la respuesta como fallback de emergencia si el envío falla.
        var contenido =
            $"<p>Se creó tu acceso al Portal del Instructor del Club Atlético Unión.</p>" +
            $"<p>Usuario: <strong>{instructor.Email}</strong><br/>Contraseña temporal: <strong>{passwordTemporal}</strong></p>" +
            $"<p>Te recomendamos cambiarla la primera vez que ingreses.</p>";

        var passwordEnviadaPorEmail = true;
        try
        {
            await _emailSender.EnviarAsync(instructor.Email, "Acceso al Portal del Instructor", contenido, cancellationToken);
        }
        catch (InvalidOperationException ex)
        {
            passwordEnviadaPorEmail = false;
            _logger.LogWarning(ex, "No se pudo enviar la contraseña temporal por email (proveedor no configurado).");
        }

        var response = new InstructorCreadoResponse(MapearAResponse(instructor), passwordEnviadaPorEmail, passwordEnviadaPorEmail ? null : passwordTemporal);
        return CreatedAtAction(nameof(Obtener), new { id = instructor.Id }, response);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "instructores.editar")]
    public async Task<ActionResult<InstructorResponse>> Actualizar(Guid id, [FromBody] ActualizarInstructorRequest request, CancellationToken cancellationToken)
    {
        var instructor = await _dbContext.Instructores.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (instructor is null)
        {
            return NotFound();
        }

        if (await _dbContext.Instructores.AnyAsync(i => i.Email == request.Email && i.Id != id, cancellationToken))
        {
            return BadRequest(new { message = "Ya existe otro instructor con ese email." });
        }

        instructor.Apellido = request.Apellido;
        instructor.Nombres = request.Nombres;
        instructor.Telefono = request.Telefono;
        instructor.Especialidad = request.Especialidad;

        if (!string.Equals(instructor.Email, request.Email, StringComparison.OrdinalIgnoreCase))
        {
            var usuario = await _userManager.FindByIdAsync(instructor.UsuarioId.ToString());
            if (usuario is not null)
            {
                usuario.Email = request.Email;
                usuario.UserName = request.Email;
                await _userManager.UpdateAsync(usuario);
            }

            instructor.Email = request.Email;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(MapearAResponse(instructor));
    }

    [HttpPost("{id:guid}/baja")]
    [Authorize(Policy = "instructores.baja")]
    public async Task<IActionResult> Baja(Guid id, [FromBody] BajaInstructorRequest request, CancellationToken cancellationToken)
    {
        var instructor = await _dbContext.Instructores.FirstOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (instructor is null)
        {
            return NotFound();
        }

        // BajaInstructorRequest.Motivo se acepta por convención de contrato (body { Motivo })
        // pero no se persiste: SPEC.md §4.2 "Instructor" no define una columna MotivoBaja.
        _ = request.Motivo;

        instructor.Estado = EstadoInstructor.Inactivo;

        var usuario = await _userManager.FindByIdAsync(instructor.UsuarioId.ToString());
        if (usuario is not null)
        {
            usuario.Estado = EstadoUsuario.Inactivo;
            await _userManager.UpdateAsync(usuario);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static InstructorResponse MapearAResponse(Instructor i) => new(
        i.Id,
        i.UsuarioId,
        i.Apellido,
        i.Nombres,
        i.DNI,
        i.Telefono,
        i.Email,
        i.Especialidad,
        i.Estado.ToString());
}
