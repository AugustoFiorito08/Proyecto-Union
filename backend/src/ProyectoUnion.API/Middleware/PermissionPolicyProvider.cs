using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace ProyectoUnion.API.Middleware;

/// <summary>
/// Provider de policies dinámico: cualquier nombre de policy usado en
/// <c>[Authorize(Policy = "socios.crear")]</c> se interpreta directamente como el código
/// de un Permiso y se resuelve en un <see cref="PermissionRequirement"/>, sin tener que
/// registrar una policy explícita por cada permiso del catálogo en Program.cs.
/// </summary>
public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly DefaultAuthorizationPolicyProvider _fallbackPolicyProvider;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        _fallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => _fallbackPolicyProvider.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => _fallbackPolicyProvider.GetFallbackPolicyAsync();

    public async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        var policiaExplicita = await _fallbackPolicyProvider.GetPolicyAsync(policyName);
        if (policiaExplicita is not null)
        {
            return policiaExplicita;
        }

        var policy = new AuthorizationPolicyBuilder();
        policy.AddRequirements(new PermissionRequirement(policyName));
        return policy.Build();
    }
}
