using FluentValidation;
using ProyectoUnion.Application.Dtos.ConceptosIngresoLibre;

namespace ProyectoUnion.Application.Validators;

public class ConceptoIngresoLibreRequestValidator : AbstractValidator<ConceptoIngresoLibreRequest>
{
    public ConceptoIngresoLibreRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
    }
}
