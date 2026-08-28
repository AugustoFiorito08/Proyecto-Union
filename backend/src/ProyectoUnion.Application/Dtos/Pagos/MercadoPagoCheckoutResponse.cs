namespace ProyectoUnion.Application.Dtos.Pagos;

public sealed record MercadoPagoCheckoutResponse(string CheckoutUrl, IReadOnlyList<Guid> PagoIds);
