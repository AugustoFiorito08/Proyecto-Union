using FluentAssertions;
using ProyectoUnion.Application.Validators;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Valida la política de contraseñas RN-LOG-01 (SPEC.md §3.10): mínimo 8 caracteres,
/// al menos una mayúscula, una minúscula y un número.
/// </summary>
public class PasswordPolicyValidatorTests
{
    [Theory]
    [InlineData("Abcdefg1")]
    [InlineData("ClubUnion#2026")]
    [InlineData("Aa1aaaaa")]
    public void CumplePolitica_ConPasswordValida_DevuelveTrue(string password)
    {
        PasswordPolicyValidator.CumplePolitica(password).Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("short1A")]        // menos de 8 caracteres
    [InlineData("abcdefgh1")]      // sin mayúscula
    [InlineData("ABCDEFGH1")]      // sin minúscula
    [InlineData("Abcdefgh")]       // sin número
    public void CumplePolitica_ConPasswordInvalida_DevuelveFalse(string? password)
    {
        PasswordPolicyValidator.CumplePolitica(password).Should().BeFalse();
    }

    [Fact]
    public void ResetPasswordRequestValidator_ConPasswordDebil_GeneraErroresPorCadaRegla()
    {
        var validator = new ResetPasswordRequestValidator();

        var resultado = validator.Validate(new Dtos.Auth.ResetPasswordRequest(
            Email: "socio@clubunion.local",
            Token: "token-valido",
            NuevaPassword: "abc"));

        resultado.IsValid.Should().BeFalse();
        resultado.Errors.Should().Contain(e => e.PropertyName == nameof(Dtos.Auth.ResetPasswordRequest.NuevaPassword));
    }

    [Fact]
    public void ResetPasswordRequestValidator_ConDatosValidos_NoGeneraErrores()
    {
        var validator = new ResetPasswordRequestValidator();

        var resultado = validator.Validate(new Dtos.Auth.ResetPasswordRequest(
            Email: "socio@clubunion.local",
            Token: "token-valido",
            NuevaPassword: "ClubUnion#2026"));

        resultado.IsValid.Should().BeTrue();
    }
}
