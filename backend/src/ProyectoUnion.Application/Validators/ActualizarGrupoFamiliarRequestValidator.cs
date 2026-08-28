using FluentValidation;
using ProyectoUnion.Application.Dtos.GruposFamiliares;

namespace ProyectoUnion.Application.Validators;

public class ActualizarGrupoFamiliarRequestValidator : AbstractValidator<ActualizarGrupoFamiliarRequest>
{
    public ActualizarGrupoFamiliarRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(200);
    }
}
