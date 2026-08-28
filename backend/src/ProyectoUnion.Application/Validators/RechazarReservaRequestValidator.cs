using FluentValidation;
using ProyectoUnion.Application.Dtos.Reservas;

namespace ProyectoUnion.Application.Validators;

public class RechazarReservaRequestValidator : AbstractValidator<RechazarReservaRequest>
{
    public RechazarReservaRequestValidator()
    {
        RuleFor(x => x.Motivo).NotEmpty().MaximumLength(500);
    }
}
