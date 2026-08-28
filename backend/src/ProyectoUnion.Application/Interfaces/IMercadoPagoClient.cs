namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Envoltorio sobre el SDK oficial de Mercado Pago (paquete NuGet MercadoPago.SDK — ver
/// ProyectoUnion.Infrastructure.MercadoPago.MercadoPagoClient). Aísla a
/// PagosController/IPagoService del SDK concreto.
/// </summary>
public interface IMercadoPagoClient
{
    /// <summary>False si "MercadoPago:AccessToken" no está configurado en este entorno.</summary>
    bool EstaConfigurado { get; }

    /// <summary>Crea una Preference de Mercado Pago y devuelve la URL de checkout (init_point).</summary>
    Task<string> CrearPreferenciaDeCheckoutAsync(
        string titulo,
        decimal importe,
        string referenciaExterna,
        CancellationToken cancellationToken);

    /// <summary>
    /// Resuelve un pago real de Mercado Pago por su id (el "data.id" del webhook) contra la
    /// API de MP, para obtener su estado ("approved"/"rejected"/etc.) y el
    /// <c>external_reference</c> con el que se creó la Preference (los Guid de Pago propios,
    /// separados por coma — ver PagosController.Checkout).
    /// </summary>
    Task<(string? Status, string? ExternalReference)> ObtenerPagoAsync(string mercadoPagoPaymentId, CancellationToken cancellationToken);
}
