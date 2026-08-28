namespace ProyectoUnion.Domain.Entities;

public enum EstadoSolicitudMembresia
{
    Pendiente = 1,
    Aprobada = 2,
    Rechazada = 3
}

/// <summary>
/// Solicitud de membresía de un No Socio (SPEC.md §4.2 "SolicitudMembresia", §5 "Solicitudes
/// de Membresía", Etapa 6). Se crea junto con el <see cref="ApplicationUser"/> del rol NoSocio
/// (RF-SOL-01/02, mismo email/contraseña que el solicitante usa luego para el seguimiento vía
/// GET /api/solicitudes-membresia/{id}/seguimiento). Al aprobarse (RF-SOL-13) da de alta un
/// Socio real y reasigna el rol del mismo ApplicationUser de NoSocio a Socio — ver
/// SolicitudMembresiaService.
/// </summary>
public class SolicitudMembresia : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid UsuarioId { get; set; }

    public ApplicationUser Usuario { get; set; } = null!;

    public string NumeroSolicitud { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    public string Apellido { get; set; } = string.Empty;

    public string DNI { get; set; } = string.Empty;

    public DateTime FechaNacimiento { get; set; }

    public string? Genero { get; set; }

    public string Email { get; set; } = string.Empty;

    public string? Telefono { get; set; }

    public string? Domicilio { get; set; }

    public string? Localidad { get; set; }

    public string? Provincia { get; set; }

    public Guid? CategoriaPretendidaId { get; set; }

    public Categoria? CategoriaPretendida { get; set; }

    public string? DocumentoIdentidadUrl { get; set; }

    public string? FichaMedicaUrl { get; set; }

    public EstadoSolicitudMembresia Estado { get; set; } = EstadoSolicitudMembresia.Pendiente;

    public string? MotivoRechazo { get; set; }

    /// <summary>
    /// Observaciones que el Empleado/Secretaría adjunta al pre-revisar una solicitud (SPEC.md
    /// §2.2, nota al pie de la matriz de permisos: Empleado puede "revisar y adjuntar
    /// observaciones a una solicitud de membresía" pero no aprobarla/rechazarla). No está en el
    /// listado literal de campos de SPEC.md §4.2 — se agrega para poder cerrar esa parte de la
    /// regla de negocio, mismo criterio que otros campos NUEVO-SPEC-IMPL ya incorporados en
    /// etapas previas (ej. Socio.CodigoQr).
    /// </summary>
    public string? Observaciones { get; set; }

    public DateTime FechaSolicitud { get; set; } = DateTime.UtcNow;
}
