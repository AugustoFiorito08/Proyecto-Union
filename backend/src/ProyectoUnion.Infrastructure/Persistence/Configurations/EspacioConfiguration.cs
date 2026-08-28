using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class EspacioConfiguration : IEntityTypeConfiguration<Espacio>
{
    public void Configure(EntityTypeBuilder<Espacio> builder)
    {
        builder.Property(e => e.Nombre).HasMaxLength(200).IsRequired();
        builder.Property(e => e.Descripcion).HasMaxLength(1000);
        builder.Property(e => e.Ubicacion).HasMaxLength(300);
        builder.Property(e => e.Precio).HasPrecision(18, 2);
        builder.Property(e => e.PorcentajeReembolso).HasPrecision(5, 2);
        builder.Property(e => e.ImagenUrl).HasMaxLength(500);

        builder.HasIndex(e => e.Estado);
        builder.HasIndex(e => e.Tipo);
    }
}
