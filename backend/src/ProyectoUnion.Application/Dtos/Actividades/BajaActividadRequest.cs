namespace ProyectoUnion.Application.Dtos.Actividades;

/// <summary>
/// Baja de actividad (marca Estado=Finalizada). <see cref="Motivo"/> se acepta por
/// convención de contrato (body { Motivo } en todo endpoint de baja) pero no se persiste:
/// SPEC.md §4.2 "Actividad" no define una columna MotivoBaja para esta entidad — decisión de
/// implementación, ver reporte final.
/// </summary>
public sealed record BajaActividadRequest(string Motivo);
