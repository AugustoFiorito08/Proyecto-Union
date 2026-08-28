namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Acción auditada sobre una entidad (RN-AUD-01, SPEC.md §3.11).
/// </summary>
public enum AccionAuditoria
{
    Alta = 1,
    Modificacion = 2,
    Baja = 3
}

/// <summary>
/// Registro de auditoría (SPEC.md §4.2 "LogAuditoria"). Poblada automáticamente por
/// <c>AuditSaveChangesInterceptor</c> para toda operación de Alta/Modificación/Baja sobre
/// entidades que implementan <see cref="Common.IAuditable"/>.
/// Nota de diseño: esta entidad NO implementa IAuditable (evita auto-auditar la auditoría).
/// </summary>
public class LogAuditoria
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UsuarioId { get; set; }

    public ApplicationUser? Usuario { get; set; }

    public string Entidad { get; set; } = string.Empty;

    public string EntidadId { get; set; } = string.Empty;

    public AccionAuditoria Accion { get; set; }

    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public string ValoresJson { get; set; } = string.Empty;
}
