using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace ProyectoUnion.Infrastructure.Persistence;

/// <summary>
/// Cifra/descifra strings sensibles con .NET Data Protection API antes de persistirlos
/// (RN-SEG-01, SPEC.md §3.12: datos médicos del Socio). El protector se crea con un
/// "purpose" fijo para que las claves de este uso no se mezclen con otros usos futuros de
/// Data Protection en la aplicación.
/// </summary>
public class EncryptedStringConverter : ValueConverter<string?, string?>
{
    public const string Purpose = "ProyectoUnion.DatosMedicos.v1";

    public EncryptedStringConverter(IDataProtectionProvider dataProtectionProvider)
        : base(
            valor => Proteger(dataProtectionProvider, valor),
            valorCifrado => Desproteger(dataProtectionProvider, valorCifrado))
    {
    }

    private static string? Proteger(IDataProtectionProvider provider, string? valor)
    {
        if (string.IsNullOrEmpty(valor))
        {
            return valor;
        }

        return provider.CreateProtector(Purpose).Protect(valor);
    }

    private static string? Desproteger(IDataProtectionProvider provider, string? valorCifrado)
    {
        if (string.IsNullOrEmpty(valorCifrado))
        {
            return valorCifrado;
        }

        return provider.CreateProtector(Purpose).Unprotect(valorCifrado);
    }
}
