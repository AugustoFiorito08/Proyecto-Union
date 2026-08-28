namespace ProyectoUnion.Domain.Common;

/// <summary>
/// Interfaz marcadora (sin miembros). Toda entidad que la implemente queda sujeta a
/// auditoría automática vía <c>AuditSaveChangesInterceptor</c> (RN-AUD-01, SPEC.md §3.11):
/// cada Alta/Modificación/Baja sobre la entidad genera un registro en <c>LogAuditoria</c>.
/// </summary>
public interface IAuditable
{
}
