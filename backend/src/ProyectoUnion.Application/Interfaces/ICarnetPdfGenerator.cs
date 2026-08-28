using ProyectoUnion.Domain.Entities;

namespace ProyectoUnion.Application.Interfaces;

/// <summary>
/// Genera el PDF del Carnet Digital del socio (base para Etapa 5, SPEC.md §6). Se genera
/// on-demand en el endpoint <c>GET /api/socios/{id}/carnet</c>, nunca se persiste.
/// </summary>
public interface ICarnetPdfGenerator
{
    byte[] GenerarCarnetPdf(Socio socio, byte[] qrPng);
}
