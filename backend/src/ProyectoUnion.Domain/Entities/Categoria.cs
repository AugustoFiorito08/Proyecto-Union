namespace ProyectoUnion.Domain.Entities;

public enum EstadoCategoria
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Categoría de socio (SPEC.md §4.2 "Categoria"): define el valor de cuota societaria
/// base que le corresponde a un Socio (RN-FIN-08, §3.18).
/// </summary>
public class Categoria : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public decimal ValorCuota { get; set; }

    public EstadoCategoria Estado { get; set; } = EstadoCategoria.Activo;

    public ICollection<Socio> Socios { get; set; } = new List<Socio>();
}
