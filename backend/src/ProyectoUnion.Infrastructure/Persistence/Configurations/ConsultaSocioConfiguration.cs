using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ConsultaSocioConfiguration : IEntityTypeConfiguration<ConsultaSocio>
{
    public void Configure(EntityTypeBuilder<ConsultaSocio> builder)
    {
        builder.Property(c => c.Area).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Asunto).HasMaxLength(300).IsRequired();
        builder.Property(c => c.Detalle).IsRequired();
        builder.Property(c => c.AdjuntoUrl).HasMaxLength(500);
        builder.Property(c => c.Respuesta);

        builder.HasOne(c => c.Socio)
            .WithMany()
            .HasForeignKey(c => c.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.RespondidoPorUsuario)
            .WithMany()
            .HasForeignKey(c => c.RespondidoPorUsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.Estado);
    }
}
