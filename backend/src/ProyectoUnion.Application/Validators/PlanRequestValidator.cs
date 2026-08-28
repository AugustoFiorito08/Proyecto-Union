using FluentValidation;
using ProyectoUnion.Application.Dtos.CoberturasMedicas;

namespace ProyectoUnion.Application.Validators;

public class PlanRequestValidator : AbstractValidator<PlanRequest>
{
    public PlanRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
    }
}
