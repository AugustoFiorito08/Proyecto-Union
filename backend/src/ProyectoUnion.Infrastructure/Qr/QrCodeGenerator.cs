using ProyectoUnion.Application.Interfaces;
using QRCoder;

namespace ProyectoUnion.Infrastructure.Qr;

/// <summary>
/// Implementación de <see cref="IQrCodeGenerator"/> con QRCoder (base para el Carnet Digital,
/// Etapa 5). Nivel de corrección de errores Q: tolera la superposición de un logo/foto sin
/// perder legibilidad si en el futuro se estiliza el QR del carnet.
/// </summary>
public class QrCodeGenerator : IQrCodeGenerator
{
    public byte[] GenerarPng(string contenido)
    {
        using var generador = new QRCodeGenerator();
        using var datosQr = generador.CreateQrCode(contenido, QRCodeGenerator.ECCLevel.Q);
        var qrPng = new PngByteQRCode(datosQr);
        return qrPng.GetGraphic(20);
    }
}
