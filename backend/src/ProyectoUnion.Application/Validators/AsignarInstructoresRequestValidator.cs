using FluentValidation;
using ProyectoUnion.Application.Dtos.Actividades;

namespace ProyectoUnion.Application.Validators;

public class AsignarInstructoresRequestValidator : AbstractValidator<AsignarInstructoresRequest>
{
    public AsignarInstructoresRequestValidator()
    {
        RuleFor(x => x.InstructorIds).NotNull();
    }
}
