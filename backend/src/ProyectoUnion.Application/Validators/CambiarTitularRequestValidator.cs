using FluentValidation;
using ProyectoUnion.Application.Dtos.GruposFamiliares;

namespace ProyectoUnion.Application.Validators;

public class CambiarTitularRequestValidator : AbstractValidator<CambiarTitularRequest>
{
    public CambiarTitularRequestValidator()
    {
        RuleFor(x => x.NuevoTitularSocioId).NotEmpty();
    }
}
