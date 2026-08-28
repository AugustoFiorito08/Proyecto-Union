using FluentValidation;
using ProyectoUnion.Application.Dtos.Socios;

namespace ProyectoUnion.Application.Validators;

public class BajaSocioRequestValidator : AbstractValidator<BajaSocioRequest>
{
    public BajaSocioRequestValidator()
    {
        RuleFor(x => x.Motivo).NotEmpty().MaximumLength(500);
    }
}
