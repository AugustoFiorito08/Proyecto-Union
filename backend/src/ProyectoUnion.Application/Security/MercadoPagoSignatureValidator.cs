using System.Security.Cryptography;
using System.Text;

namespace ProyectoUnion.Application.Security;

/// <summary>
/// Validación de la firma del webhook de Mercado Pago (header <c>x-signature</c>), según el
/// mecanismo oficial documentado por MP: HMAC-SHA256 sobre el manifest
/// <c>"id:{data.id};request-id:{x-request-id};ts:{ts};"</c> con el secreto de la integración,
/// comparado en tiempo constante contra el valor <c>v1</c> del header. Lógica pura (sin
/// acceso a base de datos ni red) para ser unit-testeable con un payload de ejemplo, sin
/// credenciales reales — Etapa 3, enunciado punto 4.
/// </summary>
public static class MercadoPagoSignatureValidator
{
    /// <param name="xSignature">Header "x-signature", formato "ts=...,v1=...".</param>
    /// <param name="xRequestId">Header "x-request-id".</param>
    /// <param name="dataId">"data.id" del body de la notificación (id del pago en MP).</param>
    /// <param name="secret">Clave secreta de webhook de la integración (MercadoPago:WebhookSecret).</param>
    public static bool Validar(string? xSignature, string? xRequestId, string? dataId, string? secret)
    {
        if (string.IsNullOrWhiteSpace(xSignature) || string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(dataId))
        {
            return false;
        }

        var (ts, v1) = ParsearFirma(xSignature);
        if (ts is null || v1 is null)
        {
            return false;
        }

        var manifest = $"id:{dataId};request-id:{xRequestId};ts:{ts};";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hashCalculado = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();

        var bytesCalculado = Encoding.UTF8.GetBytes(hashCalculado);
        var bytesRecibido = Encoding.UTF8.GetBytes(v1.ToLowerInvariant());

        return bytesCalculado.Length == bytesRecibido.Length &&
               CryptographicOperations.FixedTimeEquals(bytesCalculado, bytesRecibido);
    }

    /// <summary>Parsea "ts=1704908010,v1=618c853452..." → (ts, v1). Tolera espacios y orden.</summary>
    internal static (string? Ts, string? V1) ParsearFirma(string xSignature)
    {
        string? ts = null;
        string? v1 = null;

        foreach (var parte in xSignature.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = parte.Split('=', 2);
            if (kv.Length != 2)
            {
                continue;
            }

            var clave = kv[0].Trim();
            var valor = kv[1].Trim();

            if (clave.Equals("ts", StringComparison.OrdinalIgnoreCase))
            {
                ts = valor;
            }
            else if (clave.Equals("v1", StringComparison.OrdinalIgnoreCase))
            {
                v1 = valor;
            }
        }

        return (ts, v1);
    }
}
