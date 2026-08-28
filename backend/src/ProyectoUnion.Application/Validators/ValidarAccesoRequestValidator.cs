using FluentValidation;
using ProyectoUnion.Application.Dtos.ControlAcceso;

namespace ProyectoUnion.Application.Validators;

public class ValidarAccesoRequestValidator : AbstractValidator<ValidarAccesoRequest>
{
    public ValidarAccesoRequestValidator()
    {
        RuleFor(x => x.CodigoQr).NotEmpty();
    }
}
