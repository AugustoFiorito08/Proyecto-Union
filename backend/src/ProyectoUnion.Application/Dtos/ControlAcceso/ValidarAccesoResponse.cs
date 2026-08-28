namespace ProyectoUnion.Application.Dtos.ControlAcceso;

/// <summary>
/// Resultado de validar un QR en portería (RN-ACC-02/03/04). <see cref="SocioId"/>,
/// <see cref="Apellido"/>, <see cref="Nombres"/> y <see cref="FotoUrl"/> se completan siempre
/// que el Socio exista — permitido o denegado — para que el operador pueda verificar
/// visualmente a quién le está permitiendo o negando el paso (RN-ACC-04). Quedan todos null
/// solo cuando el QR no se reconoce (RN-ACC-02 paso 1).
/// </summary>
public sealed record ValidarAccesoResponse(
    string Resultado,
    string? MotivoDenegacion,
    DateTime FechaHora,
    Guid? SocioId,
    string? Apellido,
    string? Nombres,
    string? FotoUrl);
