namespace ProyectoUnion.Application.Dtos.Socios;

/// <summary>
/// Alta de socio (SPEC.md §5 "POST /api/socios"). <see cref="ConsentimientoDatosSalud"/>
/// registra el consentimiento informado para el tratamiento de datos de salud (RN-SEG-01,
/// §3.12) cuando el alta incluye ficha médica.
/// </summary>
public sealed record CrearSocioRequest(
    string Apellido,
    string Nombres,
    string DNI,
    string? CUIL,
    DateTime FechaNacimiento,
    string? Genero,
    string? Nacionalidad,
    int TipoPago,
    Guid CategoriaId,
    string? Telefono,
    string? Celular,
    string Email,
    string? Domicilio,
    string? Localidad,
    string? Provincia,
    string? CodigoPostal,
    Guid? CoberturaMedicaId,
    Guid? PlanId,
    string? GrupoSanguineo,
    string? ContactoEmergencia,
    string? ObservacionesMedicas,
    DateTime? FichaMedicaFechaEmision,
    bool ConsentimientoDatosSalud,
    string? FotoUrl,
    int Modalidad);
