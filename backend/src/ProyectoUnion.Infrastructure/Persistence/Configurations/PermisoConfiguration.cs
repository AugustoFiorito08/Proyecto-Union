using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class PermisoConfiguration : IEntityTypeConfiguration<Permiso>
{
    public void Configure(EntityTypeBuilder<Permiso> builder)
    {
        builder.Property(p => p.Codigo).HasMaxLength(150).IsRequired();
        builder.Property(p => p.Modulo).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Descripcion).HasMaxLength(500);

        builder.HasIndex(p => p.Codigo).IsUnique();
    }
}
