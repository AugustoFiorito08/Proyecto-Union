using Microsoft.AspNetCore.Authorization;
using ProyectoUnion.Application.Security;

namespace ProyectoUnion.API.Middleware;

/// <summary>
/// Middleware de autorización por permiso (checklist Etapa 0, SPEC.md §6): valida el
/// permiso requerido contra los claims "permiso" del JWT del usuario autenticado — no
/// contra el rol crudo. Los claims de permiso se emiten en JwtTokenService a partir de
/// RolPermiso, así que este handler no necesita consultar la base de datos.
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var tienePermiso = context.User.Claims.Any(c =>
            c.Type == ProyectoUnionClaimTypes.Permiso &&
            string.Equals(c.Value, requirement.PermissionCode, StringComparison.OrdinalIgnoreCase));

        if (tienePermiso)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
