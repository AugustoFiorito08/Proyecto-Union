using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ProyectoUnion.Infrastructure.Pdf;

/// <summary>
/// Implementación de <see cref="IComprobantePdfGenerator"/> con QuestPDF (licencia
/// Community, seteada una vez en Program.cs) — mismo patrón que CarnetPdfGenerator (Etapa
/// 1). Se genera on-demand en GET /api/pagos/{id}/comprobante; no se persiste.
/// </summary>
public class ComprobantePdfGenerator : IComprobantePdfGenerator
{
    public byte[] GenerarComprobantePdf(Pago pago)
    {
        var documento = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Arial));

                page.Header().Text("Club Atlético Unión — Comprobante de Pago").FontSize(14).Bold();

                page.Content().PaddingTop(12).Column(col =>
                {
                    col.Item().Text($"Comprobante N°: {pago.Id}");
                    col.Item().Text($"Fecha: {pago.Fecha:dd/MM/yyyy HH:mm}");
                    col.Item().Text($"Socio: {(pago.Socio is not null ? $"{pago.Socio.Apellido}, {pago.Socio.Nombres}" : "-")}");
                    col.Item().Text($"Concepto: {pago.Concepto}");
                    col.Item().Text($"Medio de pago: {pago.MedioPago}");
                    col.Item().Text($"Estado: {pago.Estado}");
                    if (!string.IsNullOrWhiteSpace(pago.MercadoPagoTransaccionId))
                    {
                        col.Item().Text($"Transacción Mercado Pago: {pago.MercadoPagoTransaccionId}");
                    }

                    col.Item().PaddingTop(8).Text($"Importe: $ {pago.Importe:N2}").FontSize(13).Bold();
                });

                page.Footer().AlignCenter().Text("Comprobante generado automáticamente — no válido como factura fiscal.").FontSize(8);
            });
        });

        return documento.GeneratePdf();
    }
}
