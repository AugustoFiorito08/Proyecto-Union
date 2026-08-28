using FluentValidation;
using ProyectoUnion.Application.Dtos.MePortal;

namespace ProyectoUnion.Application.Validators;

public class CrearMeReservaRequestValidator : AbstractValidator<CrearMeReservaRequest>
{
    public CrearMeReservaRequestValidator()
    {
        RuleFor(x => x.EspacioId).NotEmpty();
        RuleFor(x => x.Fecha).NotEmpty();
        RuleFor(x => x.Duracion).GreaterThan(0);
        RuleFor(x => x.TipoReserva).InclusiveBetween(1, 6);
        RuleFor(x => x).Must(x => x.HoraInicio < x.HoraFin)
            .WithMessage("HoraInicio debe ser anterior a HoraFin.");
    }
}
