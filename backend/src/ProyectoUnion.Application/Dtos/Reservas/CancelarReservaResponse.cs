namespace ProyectoUnion.Application.Dtos.Reservas;

/// <summary>
/// RN-RES-01 (parcial, SPEC.md §3.9 — Etapa 3 completa el reembolso).
/// <see cref="DentroDePoliticaCancelacion"/> indica si, al momento de cancelar, todavía
/// faltaban al menos <c>Espacio.PoliticaCancelacionHoras</c> horas para el inicio de la
/// reserva — así Finanzas (Etapa 3) sabe si corresponde reembolso.
/// </summary>
public sealed record CancelarReservaResponse(ReservaResponse Reserva, bool DentroDePoliticaCancelacion);
