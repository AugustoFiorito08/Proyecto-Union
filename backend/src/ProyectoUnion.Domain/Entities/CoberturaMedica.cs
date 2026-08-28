namespace ProyectoUnion.Domain.Entities;

public enum EstadoCoberturaMedica
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Cobertura médica (obra social/prepaga) del socio (SPEC.md §4.2 "CoberturaMedica").
/// Agrupa uno o más <see cref="Plan"/> específicos (ej. "OSDE" agrupa "210", "310", "410").
/// </summary>
public class CoberturaMedica : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public EstadoCoberturaMedica Estado { get; set; } = EstadoCoberturaMedica.Activo;

    public ICollection<Plan> Planes { get; set; } = new List<Plan>();

    public ICollection<Socio> Socios { get; set; } = new List<Socio>();
}
