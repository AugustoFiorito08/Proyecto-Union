using FluentValidation;
using ProyectoUnion.Application.Dtos.Actividades;

namespace ProyectoUnion.Application.Validators;

public class ActualizarActividadRequestValidator : AbstractValidator<ActualizarActividadRequest>
{
    public ActualizarActividadRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CategoriaId).NotEmpty();
        RuleFor(x => x.Precio).GreaterThanOrEqualTo(0).When(x => x.Precio.HasValue);
        RuleFor(x => x.ModalidadInscripcion).InclusiveBetween(1, 2);
        RuleFor(x => x.CupoMinimo).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CupoMaximo).GreaterThan(0);
        RuleFor(x => x).Must(x => x.CupoMaximo >= x.CupoMinimo)
            .WithMessage("CupoMaximo debe ser mayor o igual a CupoMinimo.");
        RuleFor(x => x.Duracion).GreaterThan(0);
        RuleFor(x => x.Estado).InclusiveBetween(1, 3);
    }
}
