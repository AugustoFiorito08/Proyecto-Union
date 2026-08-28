namespace ProyectoUnion.Application.Dtos.Cuotas;

public sealed record CuotaConDetalleResponse(CuotaResponse Cuota, IReadOnlyList<CuotaDetalleResponse> Detalles);
