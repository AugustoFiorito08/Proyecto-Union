using System.Text.RegularExpressions;
using FluentValidation;

namespace ProyectoUnion.Application.Validators;

/// <summary>
/// Política de contraseñas (RN-LOG-01, SPEC.md §3.10): mínimo 8 caracteres, al menos una
/// mayúscula, una minúscula y un número. Se aplica también en <c>AddIdentity</c>
/// (Options.Password) en Program.cs; este validador da mensajes de error más claros y
/// específicos por regla a nivel de API.
/// </summary>
public static class PasswordPolicyValidator
{
    public const int LongitudMinima = 8;

    private static readonly Regex TieneMayuscula = new("[A-Z]", RegexOptions.Compiled);
    private static readonly Regex TieneMinuscula = new("[a-z]", RegexOptions.Compiled);
    private static readonly Regex TieneNumero = new("[0-9]", RegexOptions.Compiled);

    public static bool CumplePolitica(string? password)
    {
        if (string.IsNullOrEmpty(password))
        {
            return false;
        }

        return password.Length >= LongitudMinima
            && TieneMayuscula.IsMatch(password)
            && TieneMinuscula.IsMatch(password)
            && TieneNumero.IsMatch(password);
    }

    /// <summary>
    /// Encadena las reglas de RN-LOG-01 sobre la propiedad de password de un validador
    /// FluentValidation existente, con un mensaje de error por regla incumplida.
    /// </summary>
    public static IRuleBuilderOptions<T, string> DebeCumplirPoliticaDeContrasena<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder
            .NotEmpty().WithMessage("La contraseña es obligatoria.")
            .MinimumLength(LongitudMinima).WithMessage($"La contraseña debe tener al menos {LongitudMinima} caracteres.")
            .Must(p => TieneMayuscula.IsMatch(p)).WithMessage("La contraseña debe incluir al menos una letra mayúscula.")
            .Must(p => TieneMinuscula.IsMatch(p)).WithMessage("La contraseña debe incluir al menos una letra minúscula.")
            .Must(p => TieneNumero.IsMatch(p)).WithMessage("La contraseña debe incluir al menos un número.");
    }
}
