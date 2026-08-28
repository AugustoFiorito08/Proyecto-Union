using FluentValidation;
using ProyectoUnion.Application.Dtos.Cuotas;

namespace ProyectoUnion.Application.Validators;

public class GenerarPeriodoRequestValidator : AbstractValidator<GenerarPeriodoRequest>
{
    public GenerarPeriodoRequestValidator()
    {
        RuleFor(x => x.Periodo)
            .NotEmpty()
            .Matches(@"^\d{4}-(0[1-9]|1[0-2])$")
            .WithMessage("Periodo debe tener el formato \"yyyy-MM\" (ej. \"2026-08\").");
    }
}
