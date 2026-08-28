using FluentValidation;
using ProyectoUnion.Application.Dtos.GruposFamiliares;

namespace ProyectoUnion.Application.Validators;

public class AgregarIntegranteRequestValidator : AbstractValidator<AgregarIntegranteRequest>
{
    public AgregarIntegranteRequestValidator()
    {
        RuleFor(x => x.SocioId).NotEmpty();
        RuleFor(x => x.Parentesco).InclusiveBetween(1, 3);
    }
}
