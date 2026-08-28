using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using ProyectoUnion.Infrastructure.Persistence.Interceptors;

namespace ProyectoUnion.Infrastructure.Identity;

/// <summary>
/// Implementación de <see cref="ICurrentUserAccessor"/> basada en el HttpContext actual:
/// lee el claim NameIdentifier (Id del usuario) del JWT ya validado por el middleware
/// de autenticación.
/// </summary>
public class CurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UsuarioId
    {
        get
        {
            var valor = _httpContextAccessor.HttpContext?.User?
                .FindFirstValue(ClaimTypes.NameIdentifier);

            return Guid.TryParse(valor, out var id) ? id : null;
        }
    }
}
