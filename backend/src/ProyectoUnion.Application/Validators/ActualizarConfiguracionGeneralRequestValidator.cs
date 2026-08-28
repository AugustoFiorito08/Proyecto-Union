using FluentValidation;
using ProyectoUnion.Application.Dtos.Configuracion;

namespace ProyectoUnion.Application.Validators;

public class ActualizarConfiguracionGeneralRequestValidator : AbstractValidator<ActualizarConfiguracionGeneralRequest>
{
    public ActualizarConfiguracionGeneralRequestValidator()
    {
        RuleFor(x => x.MaximaDeudaEnMeses).GreaterThanOrEqualTo(1);
        RuleFor(x => x.TipoTarifaFamiliar).InclusiveBetween(1, 2);
        RuleFor(x => x.TarifaPlanaGrupoImporte).GreaterThanOrEqualTo(0).When(x => x.TarifaPlanaGrupoImporte.HasValue);
        RuleFor(x => x.ToleranciaAccesoDiasCuotaVencida).GreaterThanOrEqualTo(0);

        // ---- Etapa 6: datos institucionales (SPEC.md §5) ----
        RuleFor(x => x.NombreClub).MaximumLength(200);
        RuleFor(x => x.Cuit).MaximumLength(20);
        RuleFor(x => x.Direccion).MaximumLength(250);
        RuleFor(x => x.Telefono).MaximumLength(50);
        RuleFor(x => x.EmailContacto).EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.EmailContacto)).MaximumLength(200);
        RuleFor(x => x.HorariosFuncionamiento).MaximumLength(500);
    }
}
