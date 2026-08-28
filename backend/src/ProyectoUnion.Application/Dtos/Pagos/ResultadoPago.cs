namespace ProyectoUnion.Application.Dtos.Pagos;

public enum ResultadoPagoEstado
{
    Ok,
    Invalido,
    NoEncontrado,
    Prohibido,
    Conflicto
}

/// <summary>
/// Resultado de <c>IPagoService.CrearPagosAsync</c> — reemplaza excepciones para que
/// <c>PagosController</c> pueda mapear cada caso al código HTTP correspondiente
/// (400/403/404/409) sin acoplar la Application layer a ASP.NET Core.
/// </summary>
public sealed record ResultadoPago(ResultadoPagoEstado Estado, string? Mensaje, IReadOnlyList<Guid> PagoIds)
{
    public static ResultadoPago Ok(IReadOnlyList<Guid> pagoIds) => new(ResultadoPagoEstado.Ok, null, pagoIds);

    public static ResultadoPago Invalido(string mensaje) => new(ResultadoPagoEstado.Invalido, mensaje, Array.Empty<Guid>());

    public static ResultadoPago NoEncontrado(string mensaje) => new(ResultadoPagoEstado.NoEncontrado, mensaje, Array.Empty<Guid>());

    public static ResultadoPago Prohibido(string mensaje) => new(ResultadoPagoEstado.Prohibido, mensaje, Array.Empty<Guid>());

    public static ResultadoPago Conflicto(string mensaje) => new(ResultadoPagoEstado.Conflicto, mensaje, Array.Empty<Guid>());
}
