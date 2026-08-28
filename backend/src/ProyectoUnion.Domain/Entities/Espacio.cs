namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Clasificación de un Espacio (SPEC.md §4.2 "Espacio.Tipo", ajustada por la auditoría de
/// diseño §7.3 de Salon/CanchaDeportiva/Otro a Deportivo/Recreativo/Eventos).
/// </summary>
public enum TipoEspacio
{
    Deportivo = 1,
    Recreativo = 2,
    Eventos = 3
}

public enum UnidadPrecioEspacio
{
    PorHora = 1,
    PorTurno = 2,
    PorEvento = 3
}

public enum EstadoEspacio
{
    Activo = 1,
    Inactivo = 2
}

/// <summary>
/// Espacio reservable del club (SPEC.md §4.2 "Espacio"). Define su propia política de
/// cancelación (<see cref="PoliticaCancelacionHoras"/>, <see cref="PorcentajeReembolso"/>,
/// RN-RES-01, §3.9), usada por <c>ReservasController.Cancelar</c> para calcular
/// <c>DentroDePoliticaCancelacion</c>.
/// </summary>
public class Espacio : Common.IAuditable
{
    public Guid Id { get; set; }

    public string Nombre { get; set; } = string.Empty;

    public string? Descripcion { get; set; }

    public string? Ubicacion { get; set; }

    public TipoEspacio Tipo { get; set; }

    public int Capacidad { get; set; }

    public decimal Precio { get; set; }

    public UnidadPrecioEspacio UnidadPrecio { get; set; }

    public bool SolicitarEvaluacion { get; set; }

    public bool PermitirNoSocios { get; set; }

    public EstadoEspacio Estado { get; set; } = EstadoEspacio.Activo;

    public string? ImagenUrl { get; set; }

    public int PoliticaCancelacionHoras { get; set; }

    public decimal PorcentajeReembolso { get; set; }

    public ICollection<EspacioAmenity> EspacioAmenities { get; set; } = new List<EspacioAmenity>();

    public ICollection<Reserva> Reservas { get; set; } = new List<Reserva>();

    public ICollection<Actividad> Actividades { get; set; } = new List<Actividad>();
}
