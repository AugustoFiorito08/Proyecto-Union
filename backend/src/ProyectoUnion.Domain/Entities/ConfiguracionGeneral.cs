namespace ProyectoUnion.Domain.Entities;

/// <summary>
/// Modo de cálculo de la cuota societaria de un Grupo Familiar (RN-FIN-03, SPEC.md §3.5).
/// </summary>
public enum TipoTarifaFamiliar
{
    TarifaPlanaGrupo = 1,
    SumaCategoriasIndividuales = 2
}

/// <summary>
/// Fila singleton de configuración general del sistema (SPEC.md §5 "GET/PUT
/// /api/configuracion/general", Etapa 3). Acceso exclusivo SuperAdmin (RN-FIN-02,
/// RN-FIN-03). El Id es fijo (<see cref="IdFijo"/>) y se siembra una única fila en
/// DbSeeder; no hay endpoint de alta/baja, solo lectura/edición.
/// </summary>
public class ConfiguracionGeneral
{
    /// <summary>Id fijo de la única fila de configuración — ver DbSeeder.</summary>
    public static readonly Guid IdFijo = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public Guid Id { get; set; }

    /// <summary>
    /// Máxima cantidad de meses de mora tolerados antes de la suspensión automática del
    /// Socio (RN-FIN-02, SPEC.md §3.2).
    /// </summary>
    public int MaximaDeudaEnMeses { get; set; }

    /// <summary>Modo de cálculo de la cuota de Grupo Familiar (RN-FIN-03, SPEC.md §3.5).</summary>
    public TipoTarifaFamiliar TipoTarifaFamiliar { get; set; }

    /// <summary>Solo se usa si <see cref="TipoTarifaFamiliar"/> es TarifaPlanaGrupo.</summary>
    public decimal? TarifaPlanaGrupoImporte { get; set; }

    /// <summary>
    /// Días de tolerancia desde el vencimiento de una Cuota (Estado=Vencida) antes de que
    /// bloquee el acceso por QR en portería (RN-ACC-02 paso 3, SPEC.md §3.1, Etapa 5).
    /// </summary>
    public int ToleranciaAccesoDiasCuotaVencida { get; set; } = 10;

    // ---- Etapa 6: datos institucionales del club (SPEC.md §5 "GET/PUT
    // /api/configuracion/general" — "nombre, CUIT, dirección, contacto, horarios de
    // funcionamiento"). Expuestos también, sin autenticar, por GET /api/configuracion/publica
    // (nunca junto a MaximaDeudaEnMeses/ToleranciaAccesoDiasCuotaVencida/etc.) para el
    // Portal Público y el formulario de Solicitud de Membresía. ----

    public string? NombreClub { get; set; }

    public string? Cuit { get; set; }

    public string? Direccion { get; set; }

    public string? Telefono { get; set; }

    public string? EmailContacto { get; set; }

    public string? HorariosFuncionamiento { get; set; }
}
