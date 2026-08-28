using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class SolicitudMembresiaConfiguration : IEntityTypeConfiguration<SolicitudMembresia>
{
    public void Configure(EntityTypeBuilder<SolicitudMembresia> builder)
    {
        builder.Property(s => s.NumeroSolicitud).HasMaxLength(20).IsRequired();
        builder.Property(s => s.Nombre).IsRequired();
        builder.Property(s => s.Apellido).IsRequired();
        builder.Property(s => s.DNI).IsRequired();
        builder.Property(s => s.Email).IsRequired();

        builder.HasOne(s => s.Usuario)
            .WithMany()
            .HasForeignKey(s => s.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CategoriaPretendida)
            .WithMany()
            .HasForeignKey(s => s.CategoriaPretendidaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.NumeroSolicitud).IsUnique();

        // RN-SOC-02/RF-SOL-04 (SPEC.md §3.13): DNI único mientras la solicitud está Pendiente
        // (Estado=1) — constraint filtrado, mismo criterio que CuotaConfiguration
        // (SocioId+Periodo filtrado por SocioId IS NOT NULL). Una vez Aprobada/Rechazada deja
        // de contar para la unicidad: un DNI puede volver a solicitar membresía luego de un
        // rechazo, y la unicidad definitiva post-aprobación la garantiza el índice único de
        // Socio.DNI (SocioConfiguration).
        builder.HasIndex(s => s.DNI)
            .IsUnique()
            .HasFilter("\"Estado\" = 1");
    }
}
