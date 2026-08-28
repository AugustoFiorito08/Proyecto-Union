namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Catálogo de comodidades de un Espacio (SPEC.md §4.2 "Amenity", NUEVO-SPEC-UI), ej.
/// Parrillero, Climatizado, Vestuarios.
/// </summary>
public class Amenity : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public ICollection<EspacioAmenity> EspacioAmenities { get; set; } = new List<EspacioAmenity>();
}
