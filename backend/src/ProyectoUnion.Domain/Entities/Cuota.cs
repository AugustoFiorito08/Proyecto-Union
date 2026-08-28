namespace ProyectoUnion.Domain.Entities;

public enum EstadoCuota
{
    Pendiente = 1,
    Pagada = 2,
    Vencida = 3
}

/// <summary>
/// Cuota societaria de un período (SPEC.md §4.2 "Cuota"), individual (<see cref="SocioId"/>)
/// o familiar (<see cref="GrupoFamiliarId"/>) — exactamente uno de los dos no nulo, validado
/// en <c>CuotasController</c> (no como CHECK de base de datos, mismo criterio que Pago en
/// esta implementación). El <see cref="Importe"/> se calcula y congela al generarse
/// (RN-FIN-08, §3.18); no se recalcula retroactivamente (RN-FIN-04, §3.6).
/// </summary>
public class Cuota : Common.IAuditable
{
    public Guid Id { get; set; }

    public Guid? SocioId { get; set; }

    public Socio? Socio { get; set; }

    public Guid? GrupoFamiliarId { get; set; }

    public GrupoFamiliar? GrupoFamiliar { get; set; }

    public int NumeroCuota { get; set; }

    /// <summary>Período facturado, formato "yyyy-MM" (ej. "2026-08").</summary>
    public string Periodo { get; set; } = string.Empty;

    public DateTime FechaVencimiento { get; set; }

    /// <summary>Calculado al generar la cuota (RN-FIN-08, §3.18) — suma de CuotaDetalle.</summary>
    public decimal Importe { get; set; }

    /// <summary>Aplicado por el job de mora — fuera de alcance de esta etapa (no se calcula aún).</summary>
    public decimal? RecargoMora { get; set; }

    public EstadoCuota Estado { get; set; } = EstadoCuota.Pendiente;

    public ICollection<CuotaDetalle> Detalles { get; set; } = new List<CuotaDetalle>();
}

/// <summary>
/// Desglose informativo del <see cref="Cuota.Importe"/> (SPEC.md §4.2 "CuotaDetalle",
/// RN-FIN-08, §3.18). No es cobrable de forma independiente: no tiene Estado ni Pago
/// propios, vive subordinado a la Cuota consolidada y se congela al generarse.
/// </summary>
public class CuotaDetalle
{
    public Guid Id { get; set; }

    public Guid CuotaId { get; set; }

    public Cuota Cuota { get; set; } = null!;

    public string Concepto { get; set; } = string.Empty;

    /// <summary>Null si es el componente societario base.</summary>
    public Guid? ActividadId { get; set; }

    public Actividad? Actividad { get; set; }

    /// <summary>Identifica qué integrante generó el cargo — relevante en cuotas familiares.</summary>
    public Guid? SocioId { get; set; }

    public Socio? Socio { get; set; }

    public decimal Importe { get; set; }
}
