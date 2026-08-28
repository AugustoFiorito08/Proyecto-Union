using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Infrastructure.Persistence.Configurations;

/// <summary>
/// Configuration de <see cref="Socio"/>. No se descubre vía <c>ApplyConfigurationsFromAssembly</c>
/// (que exige constructor sin parámetros): requiere <see cref="IDataProtectionProvider"/> para
/// cifrar <see cref="Socio.GrupoSanguineo"/> y <see cref="Socio.ObservacionesMedicas"/>
/// (RN-SEG-01, SPEC.md §3.12) vía <see cref="EncryptedStringConverter"/>. Se instancia e
/// invoca manualmente desde <c>ApplicationDbContext.OnModelCreating</c>.
/// </summary>
public class SocioConfiguration : IEntityTypeConfiguration<Socio>
{
    private readonly IDataProtectionProvider _dataProtectionProvider;

    public SocioConfiguration(IDataProtectionProvider dataProtectionProvider)
    {
        _dataProtectionProvider = dataProtectionProvider;
    }

    public void Configure(EntityTypeBuilder<Socio> builder)
    {
        builder.Property(s => s.NumeroSocio).HasMaxLength(50).IsRequired();
        builder.Property(s => s.Apellido).HasMaxLength(150).IsRequired();
        builder.Property(s => s.Nombres).HasMaxLength(150).IsRequired();
        builder.Property(s => s.DNI).HasMaxLength(20).IsRequired();
        builder.Property(s => s.CUIL).HasMaxLength(20);
        builder.Property(s => s.Genero).HasMaxLength(30);
        builder.Property(s => s.Nacionalidad).HasMaxLength(100);
        builder.Property(s => s.Telefono).HasMaxLength(50);
        builder.Property(s => s.Celular).HasMaxLength(50);
        builder.Property(s => s.Email).HasMaxLength(200).IsRequired();
        builder.Property(s => s.Domicilio).HasMaxLength(300);
        builder.Property(s => s.Localidad).HasMaxLength(150);
        builder.Property(s => s.Provincia).HasMaxLength(150);
        builder.Property(s => s.CodigoPostal).HasMaxLength(20);
        builder.Property(s => s.ContactoEmergencia).HasMaxLength(300);
        builder.Property(s => s.FotoUrl).HasMaxLength(500);
        builder.Property(s => s.MotivoBaja).HasMaxLength(500);
        builder.Property(s => s.CodigoQr).HasMaxLength(200).IsRequired();

        // Datos médicos sensibles cifrados en reposo (RN-SEG-01, SPEC.md §3.12). Sin límite de
        // longitud fijo: el texto cifrado es más largo que el texto plano de origen.
        var encryptedConverter = new EncryptedStringConverter(_dataProtectionProvider);
        builder.Property(s => s.GrupoSanguineo).HasConversion(encryptedConverter).HasColumnType("text");
        builder.Property(s => s.ObservacionesMedicas).HasConversion(encryptedConverter).HasColumnType("text");

        builder.HasOne(s => s.Categoria)
            .WithMany(c => c.Socios)
            .HasForeignKey(s => s.CategoriaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.CoberturaMedica)
            .WithMany(c => c.Socios)
            .HasForeignKey(s => s.CoberturaMedicaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Plan)
            .WithMany(p => p.Socios)
            .HasForeignKey(s => s.PlanId)
            .OnDelete(DeleteBehavior.Restrict);

        // Restrict (no Cascade): evita el ciclo de doble cascada con GrupoFamiliar.TitularSocioId
        // sobre el mismo par de tablas.
        builder.HasOne(s => s.GrupoFamiliar)
            .WithMany(g => g.Integrantes)
            .HasForeignKey(s => s.GrupoFamiliarId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Usuario)
            .WithMany()
            .HasForeignKey(s => s.UsuarioId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.DNI).IsUnique();
        builder.HasIndex(s => s.Email).IsUnique();
        builder.HasIndex(s => s.NumeroSocio).IsUnique();
        builder.HasIndex(s => s.CodigoQr).IsUnique();
        builder.HasIndex(s => s.Estado);
    }
}
