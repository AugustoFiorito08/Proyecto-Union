namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Archivo adjunto de una Comunicacion (SPEC.md §4.2 "ComunicacionAdjunto", NUEVO-SPEC-UI).
/// Máximo 5 por comunicación — validado en ComunicacionesController, no acá (mismo criterio
/// que <c>Comunicacion.Destinatarios</c>). El binario vive en MinIO
/// (<see cref="ProyectoUnion.Application.Interfaces.IArchivoStorageService"/>); solo se
/// persiste la clave/URL.
/// </summary>
public class ComunicacionAdjunto
{
    public Guid Id { get; set; }

    public Guid ComunicacionId { get; set; }

    public Comunicacion Comunicacion { get; set; } = null!;

    public string ArchivoUrl { get; set; } = string.Empty;

    public string NombreArchivo { get; set; } = string.Empty;
}
