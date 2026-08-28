namespace ProyectoUnion.Application.Common;

/// <summary>
/// Valida tipo y tamaño de un archivo adjunto antes de subirlo a almacenamiento (hardening OWASP
/// Top 10, Etapa 7) — usado por <c>SolicitudesMembresiaController.SubirAdjuntos</c> (endpoint
/// [AllowAnonymous]) y <c>ComunicacionesController.SubirAdjuntos</c>. Clase estática pura, mismo
/// estilo que <see cref="FichaMedicaVigenciaCalculator"/>: sin DI ni dependencia de
/// Microsoft.AspNetCore.Http, para poder testearse sin infraestructura ASP.NET Core.
/// </summary>
public static class ArchivoAdjuntoValidator
{
    private static readonly string[] ExtensionesPermitidas = { ".pdf", ".jpg", ".jpeg", ".png" };
    private static readonly string[] ContentTypesPermitidos = { "application/pdf", "image/jpeg", "image/png" };

    /// <summary>5 MB, valor de partida ajustable.</summary>
    public const long TamanioMaximoPorArchivo = 5_000_000;

    public static bool EsValido(string nombreArchivo, string? contentType, long tamanioBytes, out string? error)
    {
        if (tamanioBytes <= 0)
        {
            error = "El archivo está vacío.";
            return false;
        }

        if (tamanioBytes > TamanioMaximoPorArchivo)
        {
            error = $"El archivo supera el tamaño máximo permitido de {TamanioMaximoPorArchivo} bytes.";
            return false;
        }

        var extension = Path.GetExtension(nombreArchivo);
        if (string.IsNullOrEmpty(extension) || !ExtensionesPermitidas.Contains(extension, StringComparer.OrdinalIgnoreCase))
        {
            error = $"Extensión de archivo no permitida. Extensiones permitidas: {string.Join(", ", ExtensionesPermitidas)}.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(contentType) || !ContentTypesPermitidos.Contains(contentType, StringComparer.OrdinalIgnoreCase))
        {
            error = $"Tipo de contenido no permitido. Tipos permitidos: {string.Join(", ", ContentTypesPermitidos)}.";
            return false;
        }

        error = null;
        return true;
    }
}
