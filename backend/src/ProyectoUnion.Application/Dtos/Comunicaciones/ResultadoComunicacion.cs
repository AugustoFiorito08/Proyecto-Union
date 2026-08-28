namespace ProyectoUnion.Application.Dtos.Comunicaciones;

public enum ResultadoComunicacionEstado
{
    Ok,
    Invalido,
    NoEncontrado,
    Conflicto
}

/// <summary>
/// Resultado de las operaciones de <c>IComunicacionService</c> — reemplaza excepciones para
/// que <c>ComunicacionesController</c> pueda mapear cada caso al código HTTP correspondiente
/// (400/404/409), mismo patrón que <c>ResultadoPago</c> (Etapa 3).
/// </summary>
public sealed record ResultadoComunicacion(ResultadoComunicacionEstado Estado, string? Mensaje, Guid? ComunicacionId)
{
    public static ResultadoComunicacion Ok(Guid comunicacionId) => new(ResultadoComunicacionEstado.Ok, null, comunicacionId);

    public static ResultadoComunicacion Invalido(string mensaje) => new(ResultadoComunicacionEstado.Invalido, mensaje, null);

    public static ResultadoComunicacion NoEncontrado(string mensaje) => new(ResultadoComunicacionEstado.NoEncontrado, mensaje, null);

    public static ResultadoComunicacion Conflicto(string mensaje) => new(ResultadoComunicacionEstado.Conflicto, mensaje, null);
}
