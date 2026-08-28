using FluentValidation;
using ProyectoUnion.Application.Dtos.GruposFamiliares;

namespace ProyectoUnion.Application.Validators;

public class CrearGrupoFamiliarRequestValidator : AbstractValidator<CrearGrupoFamiliarRequest>
{
    public CrearGrupoFamiliarRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TitularSocioId).NotEmpty();
    }
}
