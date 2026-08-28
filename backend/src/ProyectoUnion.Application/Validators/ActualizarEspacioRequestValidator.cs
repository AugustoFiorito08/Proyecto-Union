using FluentValidation;
using ProyectoUnion.Application.Dtos.Espacios;

namespace ProyectoUnion.Application.Validators;

public class ActualizarEspacioRequestValidator : AbstractValidator<ActualizarEspacioRequest>
{
    public ActualizarEspacioRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Tipo).InclusiveBetween(1, 3);
        RuleFor(x => x.Capacidad).GreaterThan(0);
        RuleFor(x => x.Precio).GreaterThanOrEqualTo(0);
        RuleFor(x => x.UnidadPrecio).InclusiveBetween(1, 3);
        RuleFor(x => x.Estado).InclusiveBetween(1, 2);
        RuleFor(x => x.PoliticaCancelacionHoras).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PorcentajeReembolso).InclusiveBetween(0, 100);
    }
}
