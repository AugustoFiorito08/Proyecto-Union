using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

    public AuthController(
        UserManager<ApplicationUser> userManager,
        RoleManager<ApplicationRole> roleManager,
        IJwtTokenService jwtTokenService,
        ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _jwtTokenService = jwtTokenService;
        _dbContext = dbContext;
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
        var usuario = await _userManager.FindByEmailAsync(request.Email);
        if (usuario is null)
        {
            // No se revela si el email existe o no, para no facilitar enumeración de cuentas.
            return Ok(new { message = "Si el email existe, se generó un token de recuperación." });
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(usuario);

        // TODO(Etapa 4 - Comunicaciones): en Etapa 0 no hay proveedor de email configurado.
        // El token se devuelve directamente en la respuesta (y se loguea) únicamente para
        // poder probar el flujo end-to-end en desarrollo. Cuando se integre el módulo de
        // Comunicaciones (Email/WhatsApp), este endpoint debe enviar el token por email y
        // dejar de exponerlo en el body de la respuesta.
        return Ok(new { message = "Token de recuperación generado.", resetToken = token });
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
