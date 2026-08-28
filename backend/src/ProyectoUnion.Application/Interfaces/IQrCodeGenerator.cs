namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Generador de imágenes QR (base para el Carnet Digital, RN-ACC-01/05, SPEC.md §3.1). El
/// contenido codificado es siempre <see cref="Domain.Entities.Socio.CodigoQr"/> — un
/// identificador opaco, nunca datos personales en claro (RN-ACC-05).
/// </summary>
public interface IQrCodeGenerator
{
    /// <summary>Genera el PNG del QR para el contenido dado.</summary>
    byte[] GenerarPng(string contenido);
}
