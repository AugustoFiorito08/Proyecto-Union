using FluentValidation;
using ProyectoUnion.Application.Dtos.Actividades;

namespace ProyectoUnion.Application.Validators;

public class CrearInscripcionRequestValidator : AbstractValidator<CrearInscripcionRequest>
{
    public CrearInscripcionRequestValidator()
    {
        RuleFor(x => x.SocioId).NotEmpty();
    }
}
