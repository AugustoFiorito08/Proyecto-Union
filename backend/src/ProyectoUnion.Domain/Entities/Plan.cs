namespace ProyectoUnion.Domain.Entities;

public enum EstadoPlan
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Plan específico dentro de una <see cref="CoberturaMedica"/> (SPEC.md §4.2 "Plan",
/// NUEVO-SPEC-UI), ej. "OSDE 210".
/// </summary>
public class Plan : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid CoberturaMedicaId { get; set; }

    public CoberturaMedica CoberturaMedica { get; set; } = null!;

    public string Nombre { get; set; } = string.Empty;

    public EstadoPlan Estado { get; set; } = EstadoPlan.Activo;

    public ICollection<Socio> Socios { get; set; } = new List<Socio>();
}
