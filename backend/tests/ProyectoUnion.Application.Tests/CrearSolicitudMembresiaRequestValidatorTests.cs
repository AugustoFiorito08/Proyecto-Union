using FluentValidation.TestHelper;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;
using ProyectoUnion.Application.Validators;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10): cubre los <c>MaximumLength</c> agregados a los 5 campos
/// opcionales de <see cref="CrearSolicitudMembresiaRequestValidator"/> (Genero, Telefono,
/// Domicilio, Localidad, Provincia) — antes no tenían ningún límite pese a ser parte de un
/// endpoint [AllowAnonymous] (SolicitudesMembresiaController.Crear). Siguen siendo opcionales:
/// null pasa sin error.
/// </summary>
public class CrearSolicitudMembresiaRequestValidatorTests
{
    private readonly CrearSolicitudMembresiaRequestValidator _validator = new();

    private static CrearSolicitudMembresiaRequest CrearRequestValido(
        string? genero = null,
        string? telefono = null,
        string? domicilio = null,
        string? localidad = null,
        string? provincia = null) => new(
        Nombre: "Juan",
        Apellido: "Pérez",
        DNI: "30111222",
        FechaNacimiento: new DateTime(1990, 1, 1),
        Genero: genero,
        Email: "juan.perez@test.local",
        Telefono: telefono,
        Domicilio: domicilio,
        Localidad: localidad,
        Provincia: provincia,
        CategoriaPretendidaId: null,
        Password: "Password1");

    [Fact]
    public void CamposOpcionales_ConNull_Pasan()
    {
        var request = CrearRequestValido();

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Genero);
        resultado.ShouldNotHaveValidationErrorFor(x => x.Telefono);
        resultado.ShouldNotHaveValidationErrorFor(x => x.Domicilio);
        resultado.ShouldNotHaveValidationErrorFor(x => x.Localidad);
        resultado.ShouldNotHaveValidationErrorFor(x => x.Provincia);
    }

    [Fact]
    public void Genero_ConMasDe20Caracteres_Falla()
    {
        var request = CrearRequestValido(genero: new string('a', 21));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Genero);
    }

    [Fact]
    public void Genero_ConHasta20Caracteres_Pasa()
    {
        var request = CrearRequestValido(genero: new string('a', 20));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Genero);
    }

    [Fact]
    public void Telefono_ConMasDe50Caracteres_Falla()
    {
        var request = CrearRequestValido(telefono: new string('1', 51));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Telefono);
    }

    [Fact]
    public void Telefono_ConHasta50Caracteres_Pasa()
    {
        var request = CrearRequestValido(telefono: new string('1', 50));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Telefono);
    }

    [Fact]
    public void Domicilio_ConMasDe200Caracteres_Falla()
    {
        var request = CrearRequestValido(domicilio: new string('a', 201));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Domicilio);
    }

    [Fact]
    public void Domicilio_ConHasta200Caracteres_Pasa()
    {
        var request = CrearRequestValido(domicilio: new string('a', 200));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Domicilio);
    }

    [Fact]
    public void Localidad_ConMasDe100Caracteres_Falla()
    {
        var request = CrearRequestValido(localidad: new string('a', 101));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Localidad);
    }

    [Fact]
    public void Localidad_ConHasta100Caracteres_Pasa()
    {
        var request = CrearRequestValido(localidad: new string('a', 100));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Localidad);
    }

    [Fact]
    public void Provincia_ConMasDe100Caracteres_Falla()
    {
        var request = CrearRequestValido(provincia: new string('a', 101));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldHaveValidationErrorFor(x => x.Provincia);
    }

    [Fact]
    public void Provincia_ConHasta100Caracteres_Pasa()
    {
        var request = CrearRequestValido(provincia: new string('a', 100));

        var resultado = _validator.TestValidate(request);

        resultado.ShouldNotHaveValidationErrorFor(x => x.Provincia);
    }
}
