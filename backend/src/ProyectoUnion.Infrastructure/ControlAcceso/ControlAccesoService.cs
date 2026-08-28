using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Common;
using ProyectoUnion.Application.Dtos.ControlAcceso;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.ControlAcceso;

/// <summary>
/// Implementación de <see cref="IControlAccesoService"/> (RN-ACC-02/03/04, SPEC.md §3.1,
/// Etapa 5). RN-ACC-05 (token opaco del QR) ya está resuelta desde Etapa 1 —
/// <see cref="Socio.CodigoQr"/> — este servicio solo lo consume.
/// </summary>
public class ControlAccesoService : IControlAccesoService
{
    private const string MotivoQrNoReconocido = "QR no reconocido";
    private const string MotivoSocioSuspendido = "Socio suspendido";
    private const string MotivoSocioInactivo = "Socio inactivo";
    private const string MotivoCuotaVencida = "Cuota vencida";
    private const string MotivoFichaMedicaVencida = "Ficha médica vencida";

    private readonly ApplicationDbContext _dbContext;

    public ControlAccesoService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ValidarAccesoResponse> ValidarAsync(string codigoQr, Guid operadorUsuarioId, CancellationToken cancellationToken)
    {
        var ahora = DateTime.UtcNow;

        // RN-ACC-02 paso 1: Socio existe.
        var socio = await _dbContext.Socios.FirstOrDefaultAsync(s => s.CodigoQr == codigoQr, cancellationToken);
        if (socio is null)
        {
            return await RegistrarYResponderAsync(
                socioId: null,
                resultado: ResultadoAcceso.Denegado,
                motivo: MotivoQrNoReconocido,
                socio: null,
                operadorUsuarioId,
                ahora,
                cancellationToken);
        }

        // RN-ACC-02 paso 2: Estado del Socio.
        if (socio.Estado != EstadoSocio.Activo)
        {
            var motivoEstado = socio.Estado == EstadoSocio.Suspendido ? MotivoSocioSuspendido : MotivoSocioInactivo;
            return await RegistrarYResponderAsync(
                socioId: socio.Id,
                resultado: ResultadoAcceso.Denegado,
                motivo: motivoEstado,
                socio,
                operadorUsuarioId,
                ahora,
                cancellationToken);
        }

        // RN-ACC-02 paso 3: cuota vencida más allá de la tolerancia parametrizada — propia o
        // del Grupo Familiar (mismo criterio de resolución de grupo que RN-FIN-02,
        // MoraSuspensionService: una Cuota puede estar asociada al Socio individual o al
        // GrupoFamiliar completo).
        var configuracion = await _dbContext.ConfiguracionesGenerales.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        var toleranciaDias = configuracion?.ToleranciaAccesoDiasCuotaVencida ?? 10;
        var limiteAntiguedad = ahora.AddDays(-toleranciaDias);

        var tieneCuotaVencidaPropia = await _dbContext.Cuotas.AnyAsync(
            c => c.SocioId == socio.Id && c.Estado == EstadoCuota.Vencida && c.FechaVencimiento < limiteAntiguedad,
            cancellationToken);

        var tieneCuotaVencidaGrupo = socio.GrupoFamiliarId.HasValue && await _dbContext.Cuotas.AnyAsync(
            c => c.GrupoFamiliarId == socio.GrupoFamiliarId && c.Estado == EstadoCuota.Vencida && c.FechaVencimiento < limiteAntiguedad,
            cancellationToken);

        if (tieneCuotaVencidaPropia || tieneCuotaVencidaGrupo)
        {
            return await RegistrarYResponderAsync(
                socioId: socio.Id,
                resultado: ResultadoAcceso.Denegado,
                motivo: MotivoCuotaVencida,
                socio,
                operadorUsuarioId,
                ahora,
                cancellationToken);
        }

        // RN-ACC-02 paso 4: vigencia de Ficha Médica (RF-SOC-04 ter/quater). "ProximaAVencer"
        // no bloquea — solo "Vencida" (Vigente tampoco bloquea, obviamente).
        var vigenciaFichaMedica = FichaMedicaVigenciaCalculator.Calcular(socio.FichaMedicaFechaVencimiento);
        if (vigenciaFichaMedica == "Vencida")
        {
            return await RegistrarYResponderAsync(
                socioId: socio.Id,
                resultado: ResultadoAcceso.Denegado,
                motivo: MotivoFichaMedicaVencida,
                socio,
                operadorUsuarioId,
                ahora,
                cancellationToken);
        }

        // Las 4 validaciones pasaron.
        return await RegistrarYResponderAsync(
            socioId: socio.Id,
            resultado: ResultadoAcceso.Permitido,
            motivo: null,
            socio,
            operadorUsuarioId,
            ahora,
            cancellationToken);
    }

    private async Task<ValidarAccesoResponse> RegistrarYResponderAsync(
        Guid? socioId,
        ResultadoAcceso resultado,
        string? motivo,
        Socio? socio,
        Guid operadorUsuarioId,
        DateTime fechaHora,
        CancellationToken cancellationToken)
    {
        _dbContext.RegistrosAcceso.Add(new RegistroAcceso
        {
            Id = Guid.NewGuid(),
            SocioId = socioId,
            FechaHora = fechaHora,
            Resultado = resultado,
            MotivoDenegacion = motivo,
            OperadorUsuarioId = operadorUsuarioId
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ValidarAccesoResponse(
            resultado.ToString(),
            motivo,
            fechaHora,
            socio?.Id,
            socio?.Apellido,
            socio?.Nombres,
            socio?.FotoUrl);
    }
}
