using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class PagoConfiguration : IEntityTypeConfiguration<Pago>
{
    public void Configure(EntityTypeBuilder<Pago> builder)
    {
        builder.Property(p => p.Concepto).HasMaxLength(200);
        builder.Property(p => p.Importe).HasPrecision(18, 2);
        builder.Property(p => p.MercadoPagoTransaccionId).HasMaxLength(100);
        builder.Property(p => p.ComprobanteUrl).HasMaxLength(500);

        builder.HasOne(p => p.Socio)
            .WithMany()
            .HasForeignKey(p => p.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Cuota)
            .WithMany()
            .HasForeignKey(p => p.CuotaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.Reserva)
            .WithMany()
            .HasForeignKey(p => p.ReservaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.ConceptoIngresoLibre)
            .WithMany(c => c.Pagos)
            .HasForeignKey(p => p.ConceptoIngresoLibreId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.MercadoPagoTransaccionId);
        builder.HasIndex(p => new { p.Estado, p.Fecha });

        // RF-FIN-34 (actualizado por RN-FIN-09, SPEC.md §3.20): exactamente uno de
        // CuotaId/ReservaId/ConceptoIngresoLibreId no nulo. CHECK físico en Postgres (no solo
        // validación de aplicación en PagosController/IPagoService).
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Pago_ExactamenteUnOrigen",
            "(CASE WHEN \"CuotaId\" IS NOT NULL THEN 1 ELSE 0 END) + " +
            "(CASE WHEN \"ReservaId\" IS NOT NULL THEN 1 ELSE 0 END) + " +
            "(CASE WHEN \"ConceptoIngresoLibreId\" IS NOT NULL THEN 1 ELSE 0 END) = 1"));
    }
}
