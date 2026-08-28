using FluentValidation;
using ProyectoUnion.Application.Dtos.Categorias;

namespace ProyectoUnion.Application.Validators;

public class CategoriaRequestValidator : AbstractValidator<CategoriaRequest>
{
    public CategoriaRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Descripcion).MaximumLength(500);
        RuleFor(x => x.ValorCuota).GreaterThanOrEqualTo(0);
    }
}
