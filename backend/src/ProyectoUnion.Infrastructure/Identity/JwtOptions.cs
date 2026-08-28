namespace ProyectoUnion.Infrastructure.Identity;

/// <summary>
/// Opciones de emisión de JWT, enlazadas desde la sección "Jwt" de appsettings.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; set; } = string.Empty;

    public string Issuer { get; set; } = "ProyectoUnion.API";

    public string Audience { get; set; } = "ProyectoUnion.Clients";

    /// <summary>Duración del access token en minutos. Etapa 0: corto, ej. 15 minutos.</summary>
    public int AccessTokenMinutes { get; set; } = 15;

    /// <summary>Duración del refresh token en días.</summary>
    public int RefreshTokenDays { get; set; } = 7;
}
