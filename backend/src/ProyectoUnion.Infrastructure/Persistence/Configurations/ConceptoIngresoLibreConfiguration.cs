using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ConceptoIngresoLibreConfiguration : IEntityTypeConfiguration<ConceptoIngresoLibre>
{
    public void Configure(EntityTypeBuilder<ConceptoIngresoLibre> builder)
    {
        builder.Property(c => c.Nombre).HasMaxLength(150).IsRequired();
        builder.HasIndex(c => c.Nombre).IsUnique();
    }
}
