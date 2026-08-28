namespace ProyectoUnion.Infrastructure.Storage;

/// <summary>
/// Opciones de conexión al almacenamiento de objetos S3-compatible (MinIO), enlazadas
/// desde la sección "Minio" de appsettings (RN-INF-01, SPEC.md §3.14).
/// </summary>
public class MinioOptions
{
    public const string SectionName = "Minio";

    public string Endpoint { get; set; } = "http://localhost:9000";

    public string AccessKey { get; set; } = string.Empty;

    public string SecretKey { get; set; } = string.Empty;

    public string BucketName { get; set; } = "proyecto-union";

    /// <summary>MinIO se sirve típicamente sin TLS en desarrollo local.</summary>
    public bool UseSsl { get; set; } = false;
}
