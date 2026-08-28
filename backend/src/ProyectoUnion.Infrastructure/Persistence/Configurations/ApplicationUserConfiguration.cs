using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        // Email/NombreUsuario ya son únicos por los índices normalizados de Identity
        // (AspNetUsers.NormalizedEmail / NormalizedUserName) — RN-SOC-02, SPEC.md §3.13.
        builder.Property(u => u.RecordarSesionToken).HasMaxLength(512);

        builder.HasOne(u => u.Rol)
            .WithMany()
            .HasForeignKey(u => u.RolId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(u => u.RolId);
    }
}
