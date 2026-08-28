namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Relación N:M Espacio↔Amenity (SPEC.md §4.2 "EspacioAmenity", NUEVO-SPEC-UI). Clave
/// compuesta (EspacioId, AmenityId).
/// </summary>
public class EspacioAmenity
{
    public Guid EspacioId { get; set; }

    public Espacio Espacio { get; set; } = null!;

    public Guid AmenityId { get; set; }

    public Amenity Amenity { get; set; } = null!;
}
