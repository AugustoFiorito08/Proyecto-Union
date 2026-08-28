using FluentValidation;
using ProyectoUnion.Application.Dtos.Reservas;

namespace ProyectoUnion.Application.Validators;

public class CrearReservaRequestValidator : AbstractValidator<CrearReservaRequest>
{
    public CrearReservaRequestValidator()
    {
        RuleFor(x => x.EspacioId).NotEmpty();
        RuleFor(x => x.Fecha).NotEmpty();
        RuleFor(x => x.Duracion).GreaterThan(0);
        RuleFor(x => x.TipoReserva).InclusiveBetween(1, 6);
        RuleFor(x => x).Must(x => x.HoraInicio < x.HoraFin)
            .WithMessage("HoraInicio debe ser anterior a HoraFin.");

        // No Socio: SocioId nulo requiere los datos de contacto (SPEC.md §4.2 "Reserva").
        RuleFor(x => x.NombreContacto).NotEmpty().When(x => !x.SocioId.HasValue);
        RuleFor(x => x.TelefonoContacto).NotEmpty().When(x => !x.SocioId.HasValue);
    }
}
