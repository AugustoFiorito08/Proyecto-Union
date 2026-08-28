using Microsoft.AspNetCore.Authorization;

namespace ProyectoUnion.API.Middleware;

/// <summary>
/// Requisito de autorización parametrizado por el código de un Permiso
/// (ej. "socios.crear"). Se usa vía policies dinámicas —
/// ver <c>PermissionPolicyProvider</c> si se agrega en una etapa posterior— o registrando
/// una policy explícita por permiso en Program.cs.
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    public string PermissionCode { get; }

    public PermissionRequirement(string permissionCode)
    {
        PermissionCode = permissionCode;
    }
}
