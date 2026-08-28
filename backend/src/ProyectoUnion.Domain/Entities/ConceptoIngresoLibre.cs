namespace ProyectoUnion.Domain.Entities;

public enum EstadoConceptoIngresoLibre
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Catálogo de ingresos sin Cuota ni Reserva asociada (SPEC.md §4.2 "ConceptoIngresoLibre",
/// RN-FIN-09, §3.20), ej. "Jardín Maternal", "Eventos", "Otros". Administrado por
/// SuperAdmin/Administrador desde Configuración.
/// </summary>
public class ConceptoIngresoLibre : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public EstadoConceptoIngresoLibre Estado { get; set; } = EstadoConceptoIngresoLibre.Activo;

    public ICollection<Pago> Pagos { get; set; } = new List<Pago>();
}
