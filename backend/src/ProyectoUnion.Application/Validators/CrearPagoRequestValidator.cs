using FluentValidation;
using ProyectoUnion.Application.Dtos.Pagos;

namespace ProyectoUnion.Application.Validators;

public class CrearPagoRequestValidator : AbstractValidator<CrearPagoRequest>
{
    public CrearPagoRequestValidator()
    {
        RuleFor(x => x)
            .Must(x => new[] { x.CuotaIds is { Length: > 0 }, x.ReservaId.HasValue, x.ConceptoIngresoLibreId.HasValue }.Count(v => v) == 1)
            .WithMessage("Debe indicar exactamente uno de CuotaIds, ReservaId o ConceptoIngresoLibreId.");

        RuleFor(x => x.MedioPago).InclusiveBetween(1, 3);

        RuleFor(x => x.Importe).GreaterThan(0).When(x => x.ConceptoIngresoLibreId.HasValue);
    }
}
