using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using ProyectoUnion.Application.Interfaces;

namespace ProyectoUnion.Infrastructure.Storage;

/// <summary>
/// Implementación de <see cref="IArchivoStorageService"/> contra MinIO (S3-compatible),
/// vía AWSSDK.S3 apuntando al endpoint de MinIO configurado (RN-INF-01, SPEC.md §3.14).
/// Etapa 0: registrado en DI y funcional para subir/leer objetos; el uso concreto
/// (fichas médicas, fotos de socio, adjuntos de comunicaciones) llega en etapas
/// posteriores (1, 4).
/// </summary>
public class MinioArchivoStorageService : IArchivoStorageService
{
    private readonly IAmazonS3 _s3Client;
    private readonly MinioOptions _options;

    public MinioArchivoStorageService(IAmazonS3 s3Client, IOptions<MinioOptions> options)
    {
        _s3Client = s3Client;
        _options = options.Value;
    }

    public async Task<string> SubirArchivoAsync(
        string nombreArchivo,
        Stream contenido,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var clave = $"{Guid.NewGuid():N}-{nombreArchivo}";

        var request = new PutObjectRequest
        {
            BucketName = _options.BucketName,
            Key = clave,
            InputStream = contenido,
            ContentType = contentType,
            AutoCloseStream = false
        };

        await _s3Client.PutObjectAsync(request, cancellationToken);

        return clave;
    }

    public async Task<string> ObtenerUrlAsync(string clave, CancellationToken cancellationToken = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _options.BucketName,
            Key = clave,
            Expires = DateTime.UtcNow.AddMinutes(30),
            Verb = HttpVerb.GET
        };

        // GetPreSignedURL no es asíncrono en el SDK; se envuelve para respetar la firma
        // asíncrona de la interfaz y facilitar un futuro cambio de proveedor.
        var url = _s3Client.GetPreSignedURL(request);
        return await Task.FromResult(url);
    }
}
