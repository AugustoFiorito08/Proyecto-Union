using System.Security.Cryptography;

namespace ProyectoUnion.Application.Security;

/// <summary>
/// Genera contraseñas temporales para las cuentas de login creadas por staff (alta de
/// Instructor con cuenta, <c>POST /api/socios/{id}/crear-acceso</c>), garantizando que
/// cumplan RN-LOG-01 (SPEC.md §3.10, ver <see cref="PasswordPolicyValidator"/>): mínimo 8
/// caracteres, al menos una mayúscula, una minúscula y un número.
/// </summary>
public static class TemporaryPasswordGenerator
{
    // Excluye caracteres ambiguos (O/0, I/1/l) para reducir errores al transcribir la
    // contraseña temporal manualmente.
    private const string Mayusculas = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Minusculas = "abcdefghijkmnpqrstuvwxyz";
    private const string Numeros = "23456789";
    private const string Todos = Mayusculas + Minusculas + Numeros;

    public static string Generar(int longitud = 12)
    {
        if (longitud < 8)
        {
            longitud = 8;
        }

        var resultado = new char[longitud];
        resultado[0] = Mayusculas[RandomNumberGenerator.GetInt32(Mayusculas.Length)];
        resultado[1] = Minusculas[RandomNumberGenerator.GetInt32(Minusculas.Length)];
        resultado[2] = Numeros[RandomNumberGenerator.GetInt32(Numeros.Length)];

        for (var i = 3; i < longitud; i++)
        {
            resultado[i] = Todos[RandomNumberGenerator.GetInt32(Todos.Length)];
        }

        // Fisher-Yates: evita que las 3 primeras posiciones (garantizadas por regla) queden
        // siempre en el mismo lugar.
        for (var i = longitud - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (resultado[i], resultado[j]) = (resultado[j], resultado[i]);
        }

        return new string(resultado);
    }
}
