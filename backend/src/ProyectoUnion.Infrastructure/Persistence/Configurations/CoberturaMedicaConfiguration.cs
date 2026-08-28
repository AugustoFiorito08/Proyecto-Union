using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class CoberturaMedicaConfiguration : IEntityTypeConfiguration<CoberturaMedica>
{
    public void Configure(EntityTypeBuilder<CoberturaMedica> builder)
    {
        builder.Property(c => c.Nombre).HasMaxLength(150).IsRequired();
        builder.Property(c => c.Descripcion).HasMaxLength(500);

        builder.HasIndex(c => c.Nombre).IsUnique();
    }
}
