using FluentAssertions;
using ProyectoUnion.Application.Common;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Etapa 7 (hardening OWASP Top 10): unitario puro de <see cref="ArchivoAdjuntoValidator"/> —
/// usado por SolicitudesMembresiaController y ComunicacionesController antes de subir cualquier
/// adjunto a almacenamiento, para no aceptar tipos de archivo ni tamaños arbitrarios de un
/// cliente no confiable (varios de estos endpoints son [AllowAnonymous]).
/// </summary>
public class ArchivoAdjuntoValidatorTests
{
    [Fact]
    public void EsValido_ConExtensionNoPermitida_DevuelveFalse()
    {
        var resultado = ArchivoAdjuntoValidator.EsValido("archivo.exe", "application/pdf", 1000, out var error);

        resultado.Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void EsValido_ConContentTypeNoPermitido_DevuelveFalse()
    {
        var resultado = ArchivoAdjuntoValidator.EsValido("archivo.pdf", "application/octet-stream", 1000, out var error);

        resultado.Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void EsValido_ConTamanioCero_DevuelveFalse()
    {
        var resultado = ArchivoAdjuntoValidator.EsValido("archivo.pdf", "application/pdf", 0, out var error);

        resultado.Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void EsValido_ConTamanioExcedido_DevuelveFalse()
    {
        var resultado = ArchivoAdjuntoValidator.EsValido(
            "archivo.pdf", "application/pdf", ArchivoAdjuntoValidator.TamanioMaximoPorArchivo + 1, out var error);

        resultado.Should().BeFalse();
        error.Should().NotBeNullOrWhiteSpace();
    }

    [Theory]
    [InlineData("documento.pdf", "application/pdf")]
    [InlineData("foto.jpg", "image/jpeg")]
    [InlineData("foto.jpeg", "image/jpeg")]
    [InlineData("foto.png", "image/png")]
    [InlineData("FOTO.PNG", "image/png")]
    public void EsValido_ConArchivoValido_DevuelveTrue(string nombreArchivo, string contentType)
    {
        var resultado = ArchivoAdjuntoValidator.EsValido(nombreArchivo, contentType, 1000, out var error);

        resultado.Should().BeTrue();
        error.Should().BeNull();
    }

    [Fact]
    public void EsValido_ConTamanioEnElLimiteMaximo_DevuelveTrue()
    {
        var resultado = ArchivoAdjuntoValidator.EsValido(
            "documento.pdf", "application/pdf", ArchivoAdjuntoValidator.TamanioMaximoPorArchivo, out var error);

        resultado.Should().BeTrue();
        error.Should().BeNull();
    }
}
