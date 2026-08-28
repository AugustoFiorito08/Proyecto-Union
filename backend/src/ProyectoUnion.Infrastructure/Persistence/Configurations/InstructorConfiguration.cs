using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

public class InstructorConfiguration : IEntityTypeConfiguration<Instructor>
{
    public void Configure(EntityTypeBuilder<Instructor> builder)
    {
        builder.Property(i => i.Apellido).HasMaxLength(150).IsRequired();
        builder.Property(i => i.Nombres).HasMaxLength(150).IsRequired();
        builder.Property(i => i.DNI).HasMaxLength(20).IsRequired();
        builder.Property(i => i.Telefono).HasMaxLength(50);
        builder.Property(i => i.Email).HasMaxLength(200).IsRequired();
        builder.Property(i => i.Especialidad).HasMaxLength(200);

        builder.HasOne(i => i.Usuario)
            .WithMany()
            .HasForeignKey(i => i.UsuarioId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.UsuarioId).IsUnique();
        builder.HasIndex(i => i.DNI).IsUnique();
        builder.HasIndex(i => i.Email).IsUnique();
    }
}
