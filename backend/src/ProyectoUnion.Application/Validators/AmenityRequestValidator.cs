using FluentValidation;
using ProyectoUnion.Application.Dtos.Espacios;

namespace ProyectoUnion.Application.Validators;

public class AmenityRequestValidator : AbstractValidator<AmenityRequest>
{
    public AmenityRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
    }
}
