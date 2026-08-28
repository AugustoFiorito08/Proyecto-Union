using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ComunicacionConfiguration : IEntityTypeConfiguration<Comunicacion>
{
    public void Configure(EntityTypeBuilder<Comunicacion> builder)
    {
        builder.Property(c => c.Asunto).HasMaxLength(300).IsRequired();
        builder.Property(c => c.Descripcion).HasMaxLength(1000);
        builder.Property(c => c.ContenidoHtml).IsRequired();

        builder.HasOne(c => c.CreadoPorUsuario)
            .WithMany()
            .HasForeignKey(c => c.CreadoPorUsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.Destinatarios)
            .WithOne(d => d.Comunicacion)
            .HasForeignKey(d => d.ComunicacionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(c => c.Adjuntos)
            .WithOne(a => a.Comunicacion)
            .HasForeignKey(a => a.ComunicacionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.Estado);
        builder.HasIndex(c => c.FechaProgramada);
    }
}

public class ComunicacionDestinatarioConfiguration : IEntityTypeConfiguration<ComunicacionDestinatario>
{
    public void Configure(EntityTypeBuilder<ComunicacionDestinatario> builder)
    {
        builder.Property(d => d.MotivoFallo).HasMaxLength(500);

        builder.HasOne(d => d.Usuario)
            .WithMany()
            .HasForeignKey(d => d.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(d => new { d.UsuarioId, d.Canal });
        builder.HasIndex(d => d.EstadoEnvio);
    }
}

public class ComunicacionAdjuntoConfiguration : IEntityTypeConfiguration<ComunicacionAdjunto>
{
    public void Configure(EntityTypeBuilder<ComunicacionAdjunto> builder)
    {
        builder.Property(a => a.ArchivoUrl).HasMaxLength(500).IsRequired();
        builder.Property(a => a.NombreArchivo).HasMaxLength(300).IsRequired();
    }
}
