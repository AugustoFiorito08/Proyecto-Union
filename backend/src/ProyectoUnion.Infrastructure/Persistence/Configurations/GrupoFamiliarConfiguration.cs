using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class GrupoFamiliarConfiguration : IEntityTypeConfiguration<GrupoFamiliar>
{
    public void Configure(EntityTypeBuilder<GrupoFamiliar> builder)
    {
        builder.Property(g => g.NumeroGrupo).HasMaxLength(50).IsRequired();
        builder.Property(g => g.Nombre).HasMaxLength(200).IsRequired();
        builder.Property(g => g.Observaciones).HasMaxLength(1000);
        builder.Property(g => g.MotivoBaja).HasMaxLength(500);

        // Titular único por grupo (RF-GF-04 bis, RN-GF-01, SPEC.md §3.4/§4.2). Restrict (no
        // Cascade) para evitar el ciclo de doble cascada con Socio.GrupoFamiliarId sobre el
        // mismo par de tablas.
        builder.HasOne(g => g.TitularSocio)
            .WithMany()
            .HasForeignKey(g => g.TitularSocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(g => g.TitularSocioId).IsUnique();
        builder.HasIndex(g => g.NumeroGrupo).IsUnique();
    }
}
