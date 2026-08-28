using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence.Configurations;

namespace ProyectoUnion.Infrastructure.Persistence;

/// <summary>
/// DbContext principal. Hereda de IdentityDbContext&lt;ApplicationUser, ApplicationRole, Guid&gt;
/// para obtener el esquema de Identity (AspNetUsers, AspNetRoles, AspNetUserClaims, etc.)
/// más las entidades propias del dominio RBAC (Permiso, RolPermiso), auditoría (LogAuditoria)
/// y las de Etapa 1 (Categoria, CoberturaMedica, Plan, GrupoFamiliar, Socio).
/// El interceptor de auditoría (RN-AUD-01) se registra vía DI en DependencyInjection.cs,
/// no acá, para no acoplar el DbContext a la resolución del usuario actual.
/// </summary>
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    private readonly IDataProtectionProvider _dataProtectionProvider;

    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options,
        IDataProtectionProvider dataProtectionProvider)
        : base(options)
    {
        _dataProtectionProvider = dataProtectionProvider;
    }

    public DbSet<Permiso> Permisos => Set<Permiso>();

    public DbSet<RolPermiso> RolPermisos => Set<RolPermiso>();

    public DbSet<LogAuditoria> LogsAuditoria => Set<LogAuditoria>();

    public DbSet<Categoria> Categorias => Set<Categoria>();

    public DbSet<CoberturaMedica> CoberturasMedicas => Set<CoberturaMedica>();

    public DbSet<Plan> Planes => Set<Plan>();

    public DbSet<GrupoFamiliar> GruposFamiliares => Set<GrupoFamiliar>();

    public DbSet<Socio> Socios => Set<Socio>();

    public DbSet<Instructor> Instructores => Set<Instructor>();

    public DbSet<Actividad> Actividades => Set<Actividad>();

    public DbSet<ActividadInstructor> ActividadInstructores => Set<ActividadInstructor>();

    public DbSet<DivisionDeportiva> DivisionesDeportivas => Set<DivisionDeportiva>();

    public DbSet<DivisionInstructor> DivisionInstructores => Set<DivisionInstructor>();

    public DbSet<Inscripcion> Inscripciones => Set<Inscripcion>();

    public DbSet<Amenity> Amenities => Set<Amenity>();

    public DbSet<EspacioAmenity> EspacioAmenities => Set<EspacioAmenity>();

    public DbSet<Espacio> Espacios => Set<Espacio>();

    public DbSet<Reserva> Reservas => Set<Reserva>();

    public DbSet<ConfiguracionGeneral> ConfiguracionesGenerales => Set<ConfiguracionGeneral>();

    public DbSet<Cuota> Cuotas => Set<Cuota>();

    public DbSet<CuotaDetalle> CuotaDetalles => Set<CuotaDetalle>();

    public DbSet<Pago> Pagos => Set<Pago>();

    public DbSet<ConceptoIngresoLibre> ConceptosIngresoLibre => Set<ConceptoIngresoLibre>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // SocioConfiguration exige IDataProtectionProvider en el constructor (RN-SEG-01), por
        // lo que no puede ser descubierta por ApplyConfigurationsFromAssembly (requiere
        // constructor sin parámetros): se excluye del scan y se aplica manualmente abajo.
        builder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly,
            type => type != typeof(SocioConfiguration));

        builder.ApplyConfiguration(new SocioConfiguration(_dataProtectionProvider));
    }
}
