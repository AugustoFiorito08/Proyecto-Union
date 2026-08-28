using FluentValidation;
using ProyectoUnion.Application.Dtos.Reservas;

namespace ProyectoUnion.Application.Validators;

public class ActualizarReservaRequestValidator : AbstractValidator<ActualizarReservaRequest>
{
    public ActualizarReservaRequestValidator()
    {
        RuleFor(x => x.EspacioId).NotEmpty();
        RuleFor(x => x.Fecha).NotEmpty();
        RuleFor(x => x.Duracion).GreaterThan(0);
        RuleFor(x => x.TipoReserva).InclusiveBetween(1, 6);
        RuleFor(x => x).Must(x => x.HoraInicio < x.HoraFin)
            .WithMessage("HoraInicio debe ser anterior a HoraFin.");
    }
}
