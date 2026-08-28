using FluentValidation;
using ProyectoUnion.Application.Dtos.Actividades;

namespace ProyectoUnion.Application.Validators;

public class CrearDivisionRequestValidator : AbstractValidator<CrearDivisionRequest>
{
    public CrearDivisionRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(200);
        RuleFor(x => x.EdadMinima).GreaterThanOrEqualTo(0).When(x => x.EdadMinima.HasValue);
        RuleFor(x => x.EdadMaxima).GreaterThanOrEqualTo(0).When(x => x.EdadMaxima.HasValue);
        RuleFor(x => x.Estado).InclusiveBetween(1, 2);
    }
}
