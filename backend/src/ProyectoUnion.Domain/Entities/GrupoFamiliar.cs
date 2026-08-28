namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Tipo de grupo familiar (SPEC.md §4.2 "GrupoFamiliar", NUEVO-SPEC-UI), derivado de la
/// cantidad de hijos integrantes y persistido para poder filtrar: 0 hijos = Matrimonio,
/// 1/2/3+ hijos = GrupoFamiliar1/2/3.
/// </summary>
public enum TipoGrupoFamiliar
{
    Matrimonio = 1,
    GrupoFamiliar1 = 2,
    GrupoFamiliar2 = 3,
    GrupoFamiliar3 = 4
}

public enum EstadoGrupoFamiliar
{
    Activo = 1,
    Baja = 2
}

/// <summary>
/// Grupo familiar de socios (SPEC.md §4.2 "GrupoFamiliar"). El titular (RF-GF-04 bis,
/// RN-GF-01 §3.4) es único por grupo (<see cref="TitularSocioId"/> con índice único) y debe
/// integrar el propio grupo.
/// </summary>
public class GrupoFamiliar : Common.IAuditable
{
    public Guid Id { get; set; }

    public string NumeroGrupo { get; set; } = string.Empty;

    public string Nombre { get; set; } = string.Empty;

    public TipoGrupoFamiliar Tipo { get; set; }

    public Guid TitularSocioId { get; set; }

    public Socio TitularSocio { get; set; } = null!;

    public EstadoGrupoFamiliar Estado { get; set; } = EstadoGrupoFamiliar.Activo;

    public string? Observaciones { get; set; }

    public string? MotivoBaja { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public DateTime? FechaBaja { get; set; }

    /// <summary>
    /// Integrantes del grupo (incluye al titular). Relación distinta de
    /// <see cref="TitularSocioId"/>: un Socio "integra" un grupo vía
    /// <c>Socio.GrupoFamiliarId</c>, mientras que <see cref="TitularSocioId"/> señala
    /// cuál de esos integrantes es el titular.
    /// </summary>
    public ICollection<Socio> Integrantes { get; set; } = new List<Socio>();
}
