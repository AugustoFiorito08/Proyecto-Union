namespace ProyectoUnion.Application.Dtos.SolicitudesMembresia;

public enum ResultadoSolicitudMembresiaEstado
{
    Ok = 1,
    Invalido = 2,
    NoEncontrado = 3,
    Conflicto = 4
}

/// <summary>
/// Resultado de las operaciones de <c>ISolicitudMembresiaService</c> — mismo patrón que
/// ResultadoComunicacion (Comunicaciones, Etapa 4): separa el resultado de negocio del
/// mapeo a códigos HTTP, que hace el controller. <see cref="SocioId"/> solo se completa al
/// aprobar (RF-SOL-13, crea un Socio real a partir de la solicitud).
/// </summary>
public sealed record ResultadoSolicitudMembresia(
    ResultadoSolicitudMembresiaEstado Estado,
    string? Mensaje,
    Guid? SolicitudId,
    Guid? SocioId)
{
    public static ResultadoSolicitudMembresia Ok(Guid solicitudId, Guid? socioId = null) =>
        new(ResultadoSolicitudMembresiaEstado.Ok, null, solicitudId, socioId);

    public static ResultadoSolicitudMembresia Invalido(string mensaje) =>
        new(ResultadoSolicitudMembresiaEstado.Invalido, mensaje, null, null);

    public static ResultadoSolicitudMembresia NoEncontrado(string mensaje) =>
        new(ResultadoSolicitudMembresiaEstado.NoEncontrado, mensaje, null, null);

    public static ResultadoSolicitudMembresia Conflicto(string mensaje) =>
        new(ResultadoSolicitudMembresiaEstado.Conflicto, mensaje, null, null);
}
