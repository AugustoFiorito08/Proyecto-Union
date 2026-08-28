using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace ProyectoUnion.Infrastructure.Pdf;

/// <summary>
/// Implementación de <see cref="ICarnetPdfGenerator"/> con QuestPDF (licencia Community,
/// seteada una vez en Program.cs). Genera el PDF on-demand en el endpoint del carnet; no se
/// persiste (SPEC.md §6, base para Etapa 5).
/// </summary>
public class CarnetPdfGenerator : ICarnetPdfGenerator
{
    public byte[] GenerarCarnetPdf(Socio socio, byte[] qrPng)
    {
        var documento = Document.Create(container =>
        {
            // Tamaño aproximado de tarjeta tipo credencial (CR80, en puntos).
            container.Page(page =>
            {
                page.Size(243, 153);
                page.Margin(12);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Arial));

                page.Content().Row(row =>
                {
                    row.RelativeItem(2).Column(col =>
                    {
                        col.Item().Text("Club Atlético Unión").FontSize(11).Bold();
                        col.Item().PaddingTop(4).Text($"{socio.Apellido}, {socio.Nombres}").FontSize(10).Bold();
                        col.Item().Text($"N° Socio: {socio.NumeroSocio}");
                        col.Item().Text($"DNI: {socio.DNI}");
                        col.Item().Text($"Categoría: {socio.Categoria?.Nombre ?? "-"}");
                        col.Item().Text($"Estado: {socio.Estado}");
                    });

                    row.RelativeItem(1).AlignCenter().AlignMiddle().Image(qrPng).FitArea();
                });
            });
        });

        return documento.GeneratePdf();
    }
}
