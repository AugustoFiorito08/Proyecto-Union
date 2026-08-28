using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ReservaConfiguration : IEntityTypeConfiguration<Reserva>
{
    public void Configure(EntityTypeBuilder<Reserva> builder)
    {
        builder.Property(r => r.NombreContacto).HasMaxLength(200);
        builder.Property(r => r.TelefonoContacto).HasMaxLength(50);
        builder.Property(r => r.EmailContacto).HasMaxLength(200);
        builder.Property(r => r.Observaciones).HasMaxLength(1000);
        builder.Property(r => r.Importe).HasPrecision(18, 2);
        builder.Property(r => r.MotivoRechazo).HasMaxLength(500);

        builder.HasOne(r => r.Socio)
            .WithMany()
            .HasForeignKey(r => r.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.Espacio)
            .WithMany(e => e.Reservas)
            .HasForeignKey(r => r.EspacioId)
            .OnDelete(DeleteBehavior.Restrict);

        // Soporta la búsqueda de superposición de RF-RES-09 bis (SPEC.md §5) por
        // (EspacioId, Fecha, Estado).
        builder.HasIndex(r => new { r.EspacioId, r.Fecha, r.Estado });
    }
}
