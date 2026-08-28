namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Abstracción de almacenamiento de objetos (RN-INF-01, SPEC.md §3.14): ningún archivo
/// binario se persiste en la base relacional, solo la URL/clave del objeto. Implementada en
/// Infraestructura contra MinIO (S3-compatible) en Etapa 0; se usa recién en etapas
/// posteriores (fichas médicas, fotos, adjuntos de comunicaciones).
/// </summary>
public interface IArchivoStorageService
{
    /// <summary>
    /// Sube un archivo al bucket configurado y devuelve la clave/objeto con la que
    /// se puede recuperar luego (a persistir en la entidad correspondiente, ej. FotoUrl).
    /// </summary>
    Task<string> SubirArchivoAsync(
        string nombreArchivo,
        Stream contenido,
        string contentType,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Genera una URL (firmada o pública, según configuración) para acceder a un objeto
    /// previamente subido.
    /// </summary>
    Task<string> ObtenerUrlAsync(string clave, CancellationToken cancellationToken = default);
}
