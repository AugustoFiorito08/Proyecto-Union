using FluentValidation;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;

namespace ProyectoUnion.Application.Validators;

public class RechazarSolicitudMembresiaRequestValidator : AbstractValidator<RechazarSolicitudMembresiaRequest>
{
    public RechazarSolicitudMembresiaRequestValidator()
    {
        RuleFor(x => x.MotivoRechazo).NotEmpty().MaximumLength(500);
    }
}
