namespace ProyectoUnion.Application.Security;

/// <summary>
/// Nombres de claims propios de la aplicación, compartidos entre quien emite el JWT
/// (Infrastructure/Identity/JwtTokenService) y quien lo autoriza
/// (API/Middleware/PermissionAuthorizationHandler), para no duplicar strings mágicos.
/// </summary>
public static class ProyectoUnionClaimTypes
{
    /// <summary>Id del Rol (Guid) del usuario autenticado.</summary>
    public const string RolId = "rol_id";

    /// <summary>Nombre del Rol del usuario autenticado (ej. "SuperAdministrador").</summary>
    public const string RolNombre = "rol_nombre";

    /// <summary>
    /// Nivel jerárquico del rol (RN-ADM-01, SPEC.md §3.19). Menor valor = mayor jerarquía.
    /// </summary>
    public const string NivelJerarquico = "nivel_jerarquico";

    /// <summary>
    /// Un claim repetido por cada Permiso.Codigo que el rol del usuario tiene asignado
    /// (vía RolPermiso), para que la autorización por permiso no necesite ir a la base.
    /// </summary>
    public const string Permiso = "permiso";
}
