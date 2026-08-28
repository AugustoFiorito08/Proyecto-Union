using ProyectoUnion.Application.Dtos.SolicitudesMembresia;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Lógica de negocio de Solicitudes de Membresía (SPEC.md §5 "Solicitudes de Membresía", §4.2
/// "SolicitudMembresia", Etapa 6). Separada del controller para poder probarla con EF Core
/// InMemory sin levantar HTTP — mismo criterio que IComunicacionService/IPagoService, sumando
/// acá la creación/reasignación de rol de la cuenta de acceso vía UserManager/RoleManager de
/// Identity (primera vez que un servicio de Application/Infrastructure, en vez de un
/// controller, hace ese trabajo).
/// </summary>
public interface ISolicitudMembresiaService
{
    /// <summary>
    /// Alta pública (RF-SOL-01 a RF-SOL-04): valida unicidad de DNI/Email contra Socio y
    /// contra otras solicitudes Pendientes (RN-SOC-02, §3.13), valida la política de
    /// contraseña (RN-LOG-01), crea el ApplicationUser (rol NoSocio) y la SolicitudMembresia
    /// (Estado=Pendiente) asociada.
    /// </summary>
    Task<ResultadoSolicitudMembresia> CrearAsync(CrearSolicitudMembresiaRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Empleado/Secretaría "revisa y adjunta observaciones" (matriz §2.2, nota al pie). Solo
    /// aplica sobre una solicitud Estado=Pendiente.
    /// </summary>
    Task<ResultadoSolicitudMembresia> ActualizarObservacionesAsync(Guid id, string? observaciones, CancellationToken cancellationToken);

    /// <summary>
    /// RF-SOL-13: crea el Socio a partir de los datos de la solicitud (usa
    /// CategoriaPretendidaId o, si es null, la primera Categoria Activa por Nombre — ver
    /// comentario en la implementación), reasigna el rol del ApplicationUser existente de
    /// NoSocio a Socio y marca la solicitud Aprobada. Solo aplica sobre Estado=Pendiente.
    /// </summary>
    Task<ResultadoSolicitudMembresia> AprobarAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Marca la solicitud Rechazada con motivo. Solo aplica sobre Estado=Pendiente.</summary>
    Task<ResultadoSolicitudMembresia> RechazarAsync(Guid id, string motivoRechazo, CancellationToken cancellationToken);
}
