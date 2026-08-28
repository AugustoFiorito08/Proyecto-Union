using FluentValidation;
using ProyectoUnion.Application.Dtos.Socios;

namespace ProyectoUnion.Application.Validators;

public class ActualizarSocioRequestValidator : AbstractValidator<ActualizarSocioRequest>
{
    public ActualizarSocioRequestValidator()
    {
        RuleFor(x => x.Apellido).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Nombres).NotEmpty().MaximumLength(150);
        RuleFor(x => x.FechaNacimiento).NotEmpty().LessThan(DateTime.UtcNow);
        RuleFor(x => x.TipoPago).InclusiveBetween(1, 4);
        RuleFor(x => x.CategoriaId).NotEmpty();
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Modalidad).InclusiveBetween(1, 2);
    }
}
