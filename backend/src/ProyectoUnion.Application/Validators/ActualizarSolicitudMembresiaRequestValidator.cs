using FluentValidation;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;

namespace ProyectoUnion.Application.Validators;

public class ActualizarSolicitudMembresiaRequestValidator : AbstractValidator<ActualizarSolicitudMembresiaRequest>
{
    public ActualizarSolicitudMembresiaRequestValidator()
    {
        RuleFor(x => x.Observaciones).MaximumLength(2000);
    }
}
