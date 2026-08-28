using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class ActividadConfiguration : IEntityTypeConfiguration<Actividad>
{
    public void Configure(EntityTypeBuilder<Actividad> builder)
    {
        builder.Property(a => a.Nombre).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Descripcion).HasMaxLength(1000);
        builder.Property(a => a.Precio).HasPrecision(18, 2);
        builder.Property(a => a.Dias).HasMaxLength(200);
        builder.Property(a => a.ImagenUrl).HasMaxLength(500);

        builder.HasOne(a => a.Categoria)
            .WithMany()
            .HasForeignKey(a => a.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Espacio)
            .WithMany(e => e.Actividades)
            .HasForeignKey(a => a.EspacioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.Estado);
    }
}

public class ActividadInstructorConfiguration : IEntityTypeConfiguration<ActividadInstructor>
{
    public void Configure(EntityTypeBuilder<ActividadInstructor> builder)
    {
        builder.HasKey(ai => new { ai.ActividadId, ai.InstructorId });

        builder.HasOne(ai => ai.Actividad)
            .WithMany(a => a.ActividadInstructores)
            .HasForeignKey(ai => ai.ActividadId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(ai => ai.Instructor)
            .WithMany(i => i.ActividadInstructores)
            .HasForeignKey(ai => ai.InstructorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
