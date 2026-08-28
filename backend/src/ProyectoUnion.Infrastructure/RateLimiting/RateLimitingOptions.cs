namespace ProyectoUnion.Infrastructure.RateLimiting;

/// <summary>
/// Opciones de rate limiting por policy, enlazadas desde la sección "RateLimiting" de
/// appsettings (hardening OWASP Top 10, Etapa 7). Mismo patrón que <c>JwtOptions</c>: POCO
/// plano con defaults inline, para que la app arranque con valores razonables aunque la
/// sección no esté presente en appsettings.
/// </summary>
public class RateLimitingOptions
{
    public const string SectionName = "RateLimiting";

    /// <summary>Policy "auth" — AuthController.Login/ForgotPassword/ResetPassword.</summary>
    public int AuthPermitLimit { get; set; } = 10;

    public int AuthWindowMinutes { get; set; } = 1;

    /// <summary>Policy "solicitud-membresia-publica" — alta pública de Solicitudes de Membresía y sus adjuntos.</summary>
    public int SolicitudMembresiaPermitLimit { get; set; } = 5;

    public int SolicitudMembresiaWindowMinutes { get; set; } = 1;

    /// <summary>Policy "webhook-mp" — PagosController.Webhook.</summary>
    public int WebhookMpPermitLimit { get; set; } = 60;

    public int WebhookMpWindowMinutes { get; set; } = 1;
}
