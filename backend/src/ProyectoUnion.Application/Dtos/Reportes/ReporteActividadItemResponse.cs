namespace ProyectoUnion.Application.Dtos.Reportes;

/// <summary>
/// Fila de GET /api/reportes/actividades (Etapa 7): una por cada Actividad en
/// Estado=Activa. <see cref="InscriptosActivos"/> cuenta Inscripcion.Estado=Activa para esa
/// actividad; <see cref="PorcentajeOcupacion"/> = InscriptosActivos / CupoMaximo * 100,
/// redondeado, 0 si CupoMaximo es 0 (evita división por cero).
/// </summary>
public sealed record ReporteActividadItemResponse(
    Guid ActividadId,
    string Nombre,
    int CupoMaximo,
    int InscriptosActivos,
    int PorcentajeOcupacion);
