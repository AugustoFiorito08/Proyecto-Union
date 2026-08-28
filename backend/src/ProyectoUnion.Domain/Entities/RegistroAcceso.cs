namespace ProyectoUnion.Domain.Entities;

/// <summary>Resultado de una validación de acceso por QR en portería (RN-ACC-02/03/04).</summary>
public enum ResultadoAcceso
{
    Permitido = 1,
    Denegado = 2
}

/// <summary>
/// Registro de cada intento de acceso por QR en portería (SPEC.md §4.2 "RegistroAcceso",
/// Etapa 5, RN-ACC-03/04). Entidad de auditoría de dominio propia: no implementa
/// <see cref="Common.IAuditable"/> (mismo criterio que <see cref="ConsultaSocio"/>) porque ya
/// es en sí misma el registro de auditoría del evento — no tiene sentido generar además una
/// fila de <see cref="LogAuditoria"/> por cada intento de acceso.
/// </summary>
public class RegistroAcceso
{
    public Guid Id { get; set; }

    /// <summary>
    /// Nullable: si el QR escaneado no corresponde a ningún Socio, no hay entidad a la cual
    /// asociar el intento (RN-ACC-02, paso 1).
    /// </summary>
    public Guid? SocioId { get; set; }

    public Socio? Socio { get; set; }

    public DateTime FechaHora { get; set; } = DateTime.UtcNow;

    public ResultadoAcceso Resultado { get; set; }

    /// <summary>Solo aplica si <see cref="Resultado"/> es Denegado (RN-ACC-03).</summary>
    public string? MotivoDenegacion { get; set; }

    /// <summary>Empleado que operó el lector de portería (RN-ACC-04).</summary>
    public Guid OperadorUsuarioId { get; set; }

    public ApplicationUser OperadorUsuario { get; set; } = null!;
}
