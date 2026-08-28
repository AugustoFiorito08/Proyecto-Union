namespace ProyectoUnion.Application.Dtos.MePortal;

/// <summary>Body opcional de POST /api/me/cuotas/{id}/pagar — MedioPago (enum Domain.MedioPago, default Transferencia).</summary>
public sealed record PagarCuotaRequest(int? MedioPago);
