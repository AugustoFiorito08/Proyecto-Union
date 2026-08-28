using FluentValidation.TestHelper;
using ProyectoUnion.Application.Dtos.Auth;
using ProyectoUnion.Application.Validators;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10): cubre los límites de <see cref="LoginRequestValidator"/> —
/// Email/Password sin <c>MaximumLength</c> permitían payloads arbitrariamente grandes contra un
/// endpoint [AllowAnonymous] (superficie de ataque de denegación de servicio/abuso de recursos).
/// </summary>
public class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Fact]
    public void Email_ConMasDe200Caracteres_Falla()
    {
        var emailLargo = $"{new string('a', 195)}@test.com"; // 204 caracteres
        var request = new LoginRequest(emailLargo, "Password1");

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Email_ConHasta200Caracteres_Pasa()
    {
        var email = $"{new string('a', 191)}@test.com"; // exactamente 200 caracteres
        var request = new LoginRequest(email, "Password1");

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Password_ConMasDe100Caracteres_Falla()
    {
        var passwordLargo = new string('a', 101);
        var request = new LoginRequest("usuario@test.com", passwordLargo);

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public void Password_ConHasta100Caracteres_Pasa()
    {
        var password = new string('a', 100);
        var request = new LoginRequest("usuario@test.com", password);

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Password);
    }
}
