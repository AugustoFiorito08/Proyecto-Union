namespace ProyectoUnion.Application.Dtos.ControlAcceso;

/// <summary>Token opaco leído del QR del Carnet Digital (RN-ACC-05, Socio.CodigoQr).</summary>
public sealed record ValidarAccesoRequest(string CodigoQr);
