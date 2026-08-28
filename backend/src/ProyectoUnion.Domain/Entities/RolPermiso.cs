namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Tabla puente N:M entre ApplicationRole y Permiso (SPEC.md §4.2 "RolPermiso").
/// Clave compuesta (RolId, PermisoId) configurada en ApplicationDbContext.
/// </summary>
public class RolPermiso
{
    public Guid RolId { get; set; }

    public ApplicationRole Rol { get; set; } = null!;

    public Guid PermisoId { get; set; }

    public Permiso Permiso { get; set; } = null!;
}
