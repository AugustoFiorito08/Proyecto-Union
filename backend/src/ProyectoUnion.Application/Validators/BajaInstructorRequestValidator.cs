using FluentValidation;
using ProyectoUnion.Application.Dtos.Instructores;

namespace ProyectoUnion.Application.Validators;

public class BajaInstructorRequestValidator : AbstractValidator<BajaInstructorRequest>
{
    public BajaInstructorRequestValidator()
    {
        RuleFor(x => x.Motivo).NotEmpty().MaximumLength(500);
    }
}
