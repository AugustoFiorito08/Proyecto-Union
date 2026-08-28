using FluentValidation;
using ProyectoUnion.Application.Dtos.CoberturasMedicas;

namespace ProyectoUnion.Application.Validators;

public class CoberturaMedicaRequestValidator : AbstractValidator<CoberturaMedicaRequest>
{
    public CoberturaMedicaRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Descripcion).MaximumLength(500);
    }
}
