using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.Extensions.Options;
using ProyectoUnion.Application.Security;
using ProyectoUnion.Domain.Entities;
using ProyectoUnion.Infrastructure.Identity;
using Xunit;

namespace ProyectoUnion.Application.Tests;

/// <summary>
/// Verifica que el access token emitido por JwtTokenService incluya los claims que
/// PermissionAuthorizationHandler y el resto de la API necesitan leer sin ir a la base:
/// RolId, RolNombre, NivelJerarquico (RN-ADM-01) y un claim "permiso" por cada permiso
/// del rol.
/// </summary>
public class JwtTokenServiceTests
{
    private static JwtTokenService CrearServicio()
    {
        var options = Options.Create(new JwtOptions
        {
            Secret = "clave-de-prueba-suficientemente-larga-para-hmac-sha256-1234567890",
            Issuer = "ProyectoUnion.API.Tests",
            Audience = "ProyectoUnion.Clients.Tests",
            AccessTokenMinutes = 15,
            RefreshTokenDays = 7
        });

        return new JwtTokenService(options);
    }

    [Fact]
    public void GenerarTokens_IncluyeClaimsDeRolYNivelJerarquico()
    {
        var servicio = CrearServicio();

        var usuario = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = "admin@clubunion.local",
            UserName = "admin@clubunion.local"
        };

        var rol = new ApplicationRole
        {
            Id = Guid.NewGuid(),
            Name = "SuperAdministrador",
            NivelJerarquico = 1
        };

        var permisos = new[] { "socios.crear", "configuracion.roles.gestionar" };

        var resultado = servicio.GenerarTokens(usuario, rol, permisos);

        resultado.AccessToken.Should().NotBeNullOrWhiteSpace();
        resultado.RefreshToken.Should().NotBeNullOrWhiteSpace();
        resultado.ExpiresIn.Should().Be(15 * 60);

        var handler = new JwtSecurityTokenHandler();
        var token = handler.ReadJwtToken(resultado.AccessToken);

        token.Claims.Should().Contain(c => c.Type == ProyectoUnionClaimTypes.RolId && c.Value == rol.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == ProyectoUnionClaimTypes.RolNombre && c.Value == "SuperAdministrador");
        token.Claims.Should().Contain(c => c.Type == ProyectoUnionClaimTypes.NivelJerarquico && c.Value == "1");

        token.Claims.Where(c => c.Type == ProyectoUnionClaimTypes.Permiso)
            .Select(c => c.Value)
            .Should().BeEquivalentTo(permisos);
    }

    [Fact]
    public void GenerarRefreshToken_DevuelveValoresUnicosCadaVez()
    {
        var servicio = CrearServicio();

        var token1 = servicio.GenerarRefreshToken();
        var token2 = servicio.GenerarRefreshToken();

        token1.Should().NotBeNullOrWhiteSpace();
        token2.Should().NotBeNullOrWhiteSpace();
        token1.Should().NotBe(token2);
    }
}
