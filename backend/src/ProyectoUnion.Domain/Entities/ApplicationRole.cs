using Microsoft.AspNetCore.Identity;
using ProyectoUnion.Domain.Common;

namespace ProyectoUnion.Domain.Entities;

public enum EstadoRol
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Rol de negocio (SPEC.md §2.1, §4.2 "Rol"). RBAC dinámico: los 6 roles del sistema
/// (SuperAdministrador, Administrador, Empleado/Secretaría, Instructor, Socio, No Socio)
/// son filas de datos, no valores hardcodeados, para sostener RF-CONF-08/09 (el SuperAdmin
/// puede crear roles adicionales y ajustar permisos finos por Permiso).
/// </summary>
public class ApplicationRole : IdentityRole<Guid>, IAuditable
{
    public string? Descripcion { get; set; }

    public EstadoRol Estado { get; set; } = EstadoRol.Activo;

    /// <summary>
    /// Nivel jerárquico (RN-ADM-01, SPEC.md §3.19). Menor valor = mayor jerarquía:
    /// SuperAdministrador=1, Administrador=2, Empleado/Secretaría=3, Instructor=3, Socio=4.
    /// Un usuario de nivel N solo puede administrar usuarios cuyo rol tenga nivel
    /// estrictamente mayor a N.
    /// </summary>
    public int NivelJerarquico { get; set; }

    /// <summary>
    /// Marca los 6 roles predefinidos del sistema (no se pueden eliminar desde
    /// Configuración > Roles, a diferencia de roles adicionales creados por el SuperAdmin).
    /// </summary>
    public bool EsRolDeSistema { get; set; }

    public ICollection<RolPermiso> RolPermisos { get; set; } = new List<RolPermiso>();
}
