using FluentValidation;
using ProyectoUnion.Application.Dtos.Actividades;

namespace ProyectoUnion.Application.Validators;

public class BajaActividadRequestValidator : AbstractValidator<BajaActividadRequest>
{
    public BajaActividadRequestValidator()
    {
        RuleFor(x => x.Motivo).NotEmpty().MaximumLength(500);
    }
}
