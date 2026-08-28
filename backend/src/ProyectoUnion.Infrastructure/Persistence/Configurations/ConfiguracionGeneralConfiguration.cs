using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ConfiguracionGeneralConfiguration : IEntityTypeConfiguration<ConfiguracionGeneral>
{
    public void Configure(EntityTypeBuilder<ConfiguracionGeneral> builder)
    {
        builder.Property(c => c.TarifaPlanaGrupoImporte).HasPrecision(18, 2);
    }
}
