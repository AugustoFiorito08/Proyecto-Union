using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProyectoUnion.Application.Dtos.Auth;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ApplicationDbContext _dbContext;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IJwtTokenService jwtTokenService,
        ApplicationDbContext dbContext,
        IEmailSender emailSender,
        ILogger<AuthController> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _dbContext = dbContext;
        _emailSender = emailSender;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario is null || usuario.Estado != EstadoUsuario.Activo)
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var passwordValida = await _userManager.CheckPasswordAsync(usuario, request.Password);
        if (!passwordValida)
        {
            return Unauthorized(new { message = "Credenciales inválidas." });
        }

        var rol = await _roleManager.FindByIdAsync(usuario.RolId.ToString());
        if (rol is null)
        {
            // No debería ocurrir: RolId es NOT NULL y tiene FK a ApplicationRole.
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "El usuario no tiene un rol válido asignado." });
        }

        var permisos = await _dbContext.RolPermisos
            .Where(rp => rp.RolId == rol.Id)
            .Select(rp => rp.Permiso.Codigo)
            .ToListAsync();

        var tokens = _jwtTokenService.GenerarTokens(usuario, rol, permisos);

        usuario.RecordarSesionToken = tokens.RefreshToken;
        usuario.FechaUltimoAcceso = DateTime.UtcNow;
        await _userManager.UpdateAsync(usuario);

        return Ok(new LoginResponse(tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresIn));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var usuarioId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (usuarioId is null)
        {
            return Unauthorized();
        }

        var usuario = await _userManager.FindByIdAsync(usuarioId);
        if (usuario is null)
        {
            return NotFound();
        }

        // Invalida el refresh token activo (un solo token activo por usuario).
        usuario.RecordarSesionToken = null;
        await _userManager.UpdateAsync(usuario);

        return NoContent();
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // Mensaje de respuesta idéntico en todos los casos (exista o no el email, falle o no
        // el envío) — bug real encontrado en la reconciliación de Etapa 4: antes devolvía dos
        // textos distintos según la rama, lo que igual permitía enumerar cuentas por email
        // aunque la intención (documentada en el comentario) fuera evitarlo.
        const string mensajeGenerico = "Si el email existe, se envió un código de recuperación.";

        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario is null)
        {
            return Ok(new { message = mensajeGenerico });
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(usuario);

        // Etapa 4: el token se envía por email en vez de devolverse en la respuesta (cerrado
        // el TODO de Etapa 0). No se revela si el envío falló — la respuesta es siempre la
        // misma genérica, por seguridad (no facilitar enumeración de cuentas ni delatar
        // problemas de configuración del proveedor de email a un llamante anónimo).
        var contenido =
            $"<p>Recibimos una solicitud para restablecer tu contraseña.</p>" +
            $"<p>Código de recuperación: <strong>{token}</strong></p>" +
            $"<p>Si no solicitaste este cambio, podés ignorar este mensaje.</p>";

        try
        {
            await _emailSender.EnviarAsync(usuario.Email!, "Recuperación de contraseña", contenido);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "No se pudo enviar el email de recuperación de contraseña (proveedor no configurado).");
        }

        return Ok(new { message = mensajeGenerico });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario is null)
        {
            return BadRequest(new { message = "No se pudo restablecer la contraseña." });
        }

        var resultado = await _userManager.ResetPasswordAsync(usuario, request.Token, request.NuevaPassword);
        if (!resultado.Succeeded)
        {
            return BadRequest(new { errors = resultado.Errors.Select(e => e.Description) });
        }

        // Restablecer la contraseña invalida cualquier sesión iniciada previamente.
        usuario.RecordarSesionToken = null;
        await _userManager.UpdateAsync(usuario);

        return Ok(new { message = "Contraseña actualizada correctamente." });
    }
}
