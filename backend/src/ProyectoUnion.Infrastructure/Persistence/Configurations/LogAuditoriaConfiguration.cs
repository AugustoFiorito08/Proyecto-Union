using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class LogAuditoriaConfiguration : IEntityTypeConfiguration<LogAuditoria>
{
    public void Configure(EntityTypeBuilder<LogAuditoria> builder)
    {
        builder.Property(l => l.Entidad).HasMaxLength(200).IsRequired();
        builder.Property(l => l.EntidadId).HasMaxLength(100).IsRequired();
        builder.Property(l => l.ValoresJson).HasColumnType("jsonb");

        builder.HasOne(l => l.Usuario)
            .WithMany()
            .HasForeignKey(l => l.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(l => new { l.Entidad, l.EntidadId });
        builder.HasIndex(l => l.FechaHora);
    }
}
