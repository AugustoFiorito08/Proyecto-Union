namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Permiso atómico del sistema RBAC (SPEC.md §4.2). Ejemplo de Codigo: "socios.crear",
/// "finanzas.reportes.leer". Modulo agrupa permisos para la UI de RolePermissionMatrix (§7.2).
/// </summary>
public class Permiso
{
    public Guid Id { get; set; }

    public string Codigo { get; set; } = string.Empty;

    public string Descripcion { get; set; } = string.Empty;

    public string Modulo { get; set; } = string.Empty;

    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
}
