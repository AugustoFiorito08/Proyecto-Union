using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class RegistroAccesoConfiguration : IEntityTypeConfiguration<RegistroAcceso>
{
    public void Configure(EntityTypeBuilder<RegistroAcceso> builder)
    {
        builder.Property(r => r.MotivoDenegacion).HasMaxLength(200);

        builder.HasOne(r => r.Socio)
            .WithMany()
            .HasForeignKey(r => r.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.OperadorUsuario)
            .WithMany()
            .HasForeignKey(r => r.OperadorUsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.SocioId);
        builder.HasIndex(r => r.FechaHora);
    }
}
