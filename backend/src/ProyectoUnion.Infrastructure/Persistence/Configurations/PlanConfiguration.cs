using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class PlanConfiguration : IEntityTypeConfiguration<Plan>
{
    public void Configure(EntityTypeBuilder<Plan> builder)
    {
        builder.Property(p => p.Nombre).HasMaxLength(150).IsRequired();

        builder.HasOne(p => p.CoberturaMedica)
            .WithMany(c => c.Planes)
            .HasForeignKey(p => p.CoberturaMedicaId)
            .OnDelete(DeleteBehavior.Restrict);

        // Único dentro de cada cobertura (ej. "OSDE" no puede tener dos planes "210").
        builder.HasIndex(p => new { p.CoberturaMedicaId, p.Nombre }).IsUnique();
    }
}
