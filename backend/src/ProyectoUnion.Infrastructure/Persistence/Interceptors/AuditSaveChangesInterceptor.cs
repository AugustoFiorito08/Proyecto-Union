using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ProyectoUnion.Domain.Common;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Implementa RN-AUD-01 (SPEC.md §3.11): audita automáticamente toda operación de
/// Alta/Modificación/Baja sobre entidades que implementan <see cref="IAuditable"/>
/// (Socio, GrupoFamiliar, Cuota, Pago, Actividad, Reserva, Usuario, Configuración, etc.
/// a medida que se agreguen en etapas posteriores). Se excluyen entidades de solo lectura
/// o cachés y, explícitamente, LogAuditoria misma (no implementa IAuditable).
/// </summary>
public class AuditSaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserAccessor _currentUserAccessor;

    public AuditSaveChangesInterceptor(ICurrentUserAccessor currentUserAccessor)
    {
        _currentUserAccessor = currentUserAccessor;
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
        {
            AgregarRegistrosDeAuditoria(eventData.Context);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        if (eventData.Context is not null)
        {
            AgregarRegistrosDeAuditoria(eventData.Context);
        }

        return base.SavingChanges(eventData, result);
    }

    private void AgregarRegistrosDeAuditoria(DbContext context)
    {
        var usuarioId = _currentUserAccessor.UsuarioId;

        var entradasAuditables = context.ChangeTracker.Entries()
            .Where(e => e.Entity is IAuditable
                && (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted))
            .ToList();

        foreach (var entrada in entradasAuditables)
        {
            var accion = entrada.State switch
            {
                EntityState.Added => AccionAuditoria.Alta,
                EntityState.Deleted => AccionAuditoria.Baja,
                _ => AccionAuditoria.Modificacion
            };

            var valores = ObtenerValores(entrada);
            var entidadId = ObtenerClavePrimaria(entrada);

            context.Set<LogAuditoria>().Add(new LogAuditoria
            {
                Id = Guid.NewGuid(),
                UsuarioId = usuarioId,
                Entidad = entrada.Entity.GetType().Name,
                EntidadId = entidadId,
                Accion = accion,
                FechaHora = DateTime.UtcNow,
                ValoresJson = JsonSerializer.Serialize(valores)
            });
        }
    }

    private static Dictionary<string, object?> ObtenerValores(EntityEntry entrada)
    {
        var valores = new Dictionary<string, object?>();

        foreach (var propiedad in entrada.Properties)
        {
            // Para bajas, CurrentValues aún refleja el último estado conocido antes del delete.
            valores[propiedad.Metadata.Name] = propiedad.CurrentValue;
        }

        return valores;
    }

    private static string ObtenerClavePrimaria(EntityEntry entrada)
    {
        var clave = entrada.Metadata.FindPrimaryKey();
        if (clave is null)
        {
            return string.Empty;
        }

        var valores = clave.Properties
            .Select(p => entrada.Property(p.Name).CurrentValue?.ToString() ?? string.Empty);

        return string.Join(",", valores);
    }
}

/// <summary>
/// Resuelve el usuario autenticado actual (desde el HttpContext, vía JWT) para poblar
/// LogAuditoria.UsuarioId. Se abstrae detrás de una interfaz para que Infrastructure no
/// dependa directamente de ASP.NET Core HttpContext en la capa de persistencia.
/// </summary>
public interface ICurrentUserAccessor
{
    Guid? UsuarioId { get; }
}
