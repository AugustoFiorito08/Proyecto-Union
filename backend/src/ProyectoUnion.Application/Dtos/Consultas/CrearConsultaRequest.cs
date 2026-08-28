namespace ProyectoUnion.Application.Dtos.Consultas;

/// <summary>Body de POST /api/me/consultas (SPEC.md §5 "Portal del Socio").</summary>
public sealed record CrearConsultaRequest(string Area, string Asunto, string Detalle, string? AdjuntoUrl);
