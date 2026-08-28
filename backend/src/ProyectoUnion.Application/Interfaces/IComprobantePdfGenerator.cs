using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Genera el comprobante de un Pago en PDF on-demand (GET /api/pagos/{id}/comprobante,
/// SPEC.md §5), mismo patrón que ICarnetPdfGenerator (Etapa 1): nunca se persiste.
/// </summary>
public interface IComprobantePdfGenerator
{
    byte[] GenerarComprobantePdf(Pago pago);
}
