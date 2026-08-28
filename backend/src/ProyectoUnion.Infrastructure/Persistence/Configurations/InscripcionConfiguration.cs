using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class InscripcionConfiguration : IEntityTypeConfiguration<Inscripcion>
{
    public void Configure(EntityTypeBuilder<Inscripcion> builder)
    {
        builder.HasOne(i => i.Socio)
            .WithMany()
            .HasForeignKey(i => i.SocioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Actividad)
            .WithMany(a => a.Inscripciones)
            .HasForeignKey(i => i.ActividadId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.DivisionDeportiva)
            .WithMany(d => d.Inscripciones)
            .HasForeignKey(i => i.DivisionDeportivaId)
            .OnDelete(DeleteBehavior.Restrict);

        // (SocioId, ActividadId) único mientras Estado=Activa (SPEC.md §4.2 "Inscripcion").
        // Índice único filtrado en vez de validación exclusiva de aplicación: Postgres lo
        // soporta directamente con HasFilter y evita condiciones de carrera entre dos
        // requests concurrentes inscribiendo al mismo socio a la misma actividad.
        builder.HasIndex(i => new { i.SocioId, i.ActividadId })
            .IsUnique()
            .HasFilter("\"Estado\" = 1");
    }
}
