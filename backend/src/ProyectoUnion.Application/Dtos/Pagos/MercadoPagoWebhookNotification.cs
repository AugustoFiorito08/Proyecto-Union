namespace ProyectoUnion.Application.Dtos.Pagos;

/// <summary>
/// Forma del payload que envía Mercado Pago a POST /api/pagos/mercadopago/webhook para el
/// tipo de evento "payment" (Etapa 3, enunciado punto 4). Solo se modelan los campos que
/// realmente se usan; el resto del payload real de MP se ignora.
/// </summary>
public sealed record MercadoPagoWebhookNotification(string? Type, string? Action, MercadoPagoWebhookData? Data);

public sealed record MercadoPagoWebhookData(string? Id);
