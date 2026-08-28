using FluentValidation;
using ProyectoUnion.Application.Dtos.Instructores;

namespace ProyectoUnion.Application.Validators;

public class ActualizarInstructorRequestValidator : AbstractValidator<ActualizarInstructorRequest>
{
    public ActualizarInstructorRequestValidator()
    {
        RuleFor(x => x.Apellido).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Nombres).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Telefono).MaximumLength(50);
        RuleFor(x => x.Especialidad).MaximumLength(200);
    }
}
