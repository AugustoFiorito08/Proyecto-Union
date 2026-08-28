using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class CuotaConfiguration : IEntityTypeConfiguration<Cuota>
{
    public void Configure(EntityTypeBuilder<Cuota> builder)
    {
        builder.Property(c => c.Periodo).HasMaxLength(7).IsRequired();
        builder.Property(c => c.Importe).HasPrecision(18, 2);
        builder.Property(c => c.RecargoMora).HasPrecision(18, 2);

        builder.HasOne(c => c.Socio)
            .WithMany()
            .HasForeignKey(c => c.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.GrupoFamiliar)
            .WithMany()
            .HasForeignKey(c => c.GrupoFamiliarId)
            .OnDelete(DeleteBehavior.Restrict);

        // Idempotencia de POST /api/cuotas/generar-periodo (SPEC.md §5, enunciado Etapa 3):
        // no se duplica una Cuota para el mismo Socio/GrupoFamiliar + Periodo.
        builder.HasIndex(c => new { c.SocioId, c.Periodo })
            .IsUnique()
            .HasFilter("\"SocioId\" IS NOT NULL");

        builder.HasIndex(c => new { c.GrupoFamiliarId, c.Periodo })
            .IsUnique()
            .HasFilter("\"GrupoFamiliarId\" IS NOT NULL");

        builder.HasIndex(c => new { c.Estado, c.FechaVencimiento });
    }
}

public class CuotaDetalleConfiguration : IEntityTypeConfiguration<CuotaDetalle>
{
    public void Configure(EntityTypeBuilder<CuotaDetalle> builder)
    {
        builder.Property(d => d.Concepto).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Importe).HasPrecision(18, 2);

        builder.HasOne(d => d.Cuota)
            .WithMany(c => c.Detalles)
            .HasForeignKey(d => d.CuotaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.Actividad)
            .WithMany()
            .HasForeignKey(d => d.ActividadId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Socio)
            .WithMany()
            .HasForeignKey(d => d.SocioId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
