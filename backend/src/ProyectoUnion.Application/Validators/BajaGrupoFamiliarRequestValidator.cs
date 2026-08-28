using FluentValidation;
using ProyectoUnion.Application.Dtos.GruposFamiliares;

namespace ProyectoUnion.Application.Validators;

public class BajaGrupoFamiliarRequestValidator : AbstractValidator<BajaGrupoFamiliarRequest>
{
    public BajaGrupoFamiliarRequestValidator()
    {
        RuleFor(x => x.Motivo).NotEmpty().MaximumLength(500);
    }
}
