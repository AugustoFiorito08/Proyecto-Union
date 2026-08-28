namespace ProyectoUnion.Application.Common;

/// <summary>
/// Semáforo de vigencia de la Ficha Médica de un Socio (RF-SOC-04 ter/quater), compartido
/// entre <c>SociosController</c> (lo expone a roles sin acceso a la ficha médica completa) y
/// <c>ControlAccesoService</c> (RN-ACC-02 paso 4, Etapa 5: bloquea el acceso si está Vencida).
/// Vive en Application (no en Domain) porque es lógica de presentación/negocio derivada, no
/// un dato propio de la entidad.
/// </summary>
public static class FichaMedicaVigenciaCalculator
{
    /// <summary>
    /// El umbral de 30 días para "próxima a vencer" es una decisión de implementación
    /// razonable, no especificada literalmente en el SPEC (ver SociosController, Etapa 1).
    /// </summary>
    public static string? Calcular(DateTime? vencimiento)
    {
        if (!vencimiento.HasValue)
        {
            return null;
        }

        var diasRestantes = (vencimiento.Value.Date - DateTime.UtcNow.Date).TotalDays;
        if (diasRestantes < 0)
        {
            return "Vencida";
        }

        return diasRestantes <= 30 ? "ProximaAVencer" : "Vigente";
    }
}
