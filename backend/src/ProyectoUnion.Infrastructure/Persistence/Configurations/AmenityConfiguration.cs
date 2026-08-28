using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class AmenityConfiguration : IEntityTypeConfiguration<Amenity>
{
    public void Configure(EntityTypeBuilder<Amenity> builder)
    {
        builder.Property(a => a.Nombre).HasMaxLength(150).IsRequired();
        builder.HasIndex(a => a.Nombre).IsUnique();
    }
}

public class EspacioAmenityConfiguration : IEntityTypeConfiguration<EspacioAmenity>
{
    public void Configure(EntityTypeBuilder<EspacioAmenity> builder)
    {
        builder.HasKey(ea => new { ea.EspacioId, ea.AmenityId });

        builder.HasOne(ea => ea.Espacio)
            .WithMany(e => e.EspacioAmenities)
            .HasForeignKey(ea => ea.EspacioId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ea => ea.Amenity)
            .WithMany(a => a.EspacioAmenities)
            .HasForeignKey(ea => ea.AmenityId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
