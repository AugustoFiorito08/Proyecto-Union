using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class DivisionDeportivaConfiguration : IEntityTypeConfiguration<DivisionDeportiva>
{
    public void Configure(EntityTypeBuilder<DivisionDeportiva> builder)
    {
        builder.Property(d => d.Nombre).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Genero).HasMaxLength(30);
        builder.Property(d => d.Dias).HasMaxLength(200);

        builder.HasOne(d => d.Actividad)
            .WithMany(a => a.Divisiones)
            .HasForeignKey(d => d.ActividadId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class DivisionInstructorConfiguration : IEntityTypeConfiguration<DivisionInstructor>
{
    public void Configure(EntityTypeBuilder<DivisionInstructor> builder)
    {
        builder.HasKey(di => new { di.DivisionDeportivaId, di.InstructorId });

        builder.HasOne(di => di.DivisionDeportiva)
            .WithMany(d => d.DivisionInstructores)
            .HasForeignKey(di => di.DivisionDeportivaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(di => di.Instructor)
            .WithMany(i => i.DivisionInstructores)
            .HasForeignKey(di => di.InstructorId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
