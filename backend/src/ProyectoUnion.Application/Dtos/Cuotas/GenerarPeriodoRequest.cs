namespace ProyectoUnion.Application.Dtos.Cuotas;

/// <summary>Período a facturar, formato "yyyy-MM" (ej. "2026-08") — RN-FIN-08, SPEC.md §3.18.</summary>
public sealed record GenerarPeriodoRequest(string Periodo);
