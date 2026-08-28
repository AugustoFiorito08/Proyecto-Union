using Microsoft.EntityFrameworkCore;
using ProyectoUnion.Application.Interfaces;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Persistence;

namespace ProyectoUnion.Infrastructure.Comunicaciones;

/// <summary>
/// Implementación de <see cref="ICumpleanosService"/> (RF-COM-24, SPEC.md §6 Etapa 4).
/// Decisión de implementación: se notifica por Email + Novedad (no WhatsApp por defecto, para
/// no depender de que todos los socios tengan teléfono cargado).
/// </summary>
public class CumpleanosService : ICumpleanosService
{
    private static readonly CanalComunicacion[] CanalesPorDefecto = [CanalComunicacion.Email, CanalComunicacion.Novedad];

    private readonly ApplicationDbContext _dbContext;
    private readonly IComunicacionService _comunicacionService;

    public CumpleanosService(ApplicationDbContext dbContext, IComunicacionService comunicacionService)
    {
        _dbContext = dbContext;
        _comunicacionService = comunicacionService;
    }

    public async Task<int> ProcesarCumpleanosDelDiaAsync(CancellationToken cancellationToken)
    {
        var hoy = DateTime.UtcNow;

        var cumpleaneros = await _dbContext.Socios
            .AsNoTracking()
            .Where(s => s.Estado == EstadoSocio.Activo && s.UsuarioId != null &&
                        s.FechaNacimiento.Month == hoy.Month && s.FechaNacimiento.Day == hoy.Day)
            .ToListAsync(cancellationToken);

        var notificados = 0;
        foreach (var socio in cumpleaneros)
        {
            var contenido = $"<p>¡Feliz cumpleaños, {socio.Nombres}! Todo el equipo del Club Atlético Unión te desea un gran día.</p>";

            var comunicacion = await _comunicacionService.CrearYEnviarASocioAsync(
                socio.Id,
                "¡Feliz cumpleaños!",
                contenido,
                TipoComunicacion.Cumpleanos,
                CanalesPorDefecto,
                creadoPorUsuarioId: null,
                cancellationToken);

            if (comunicacion is not null)
            {
                notificados++;
            }
        }

        return notificados;
    }
}
