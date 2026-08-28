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
    }
}
