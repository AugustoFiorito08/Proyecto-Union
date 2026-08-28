using FluentValidation;
using ProyectoUnion.Application.Dtos.SolicitudesMembresia;

namespace ProyectoUnion.Application.Validators;

public class CrearSolicitudMembresiaRequestValidator : AbstractValidator<CrearSolicitudMembresiaRequest>
{
    public CrearSolicitudMembresiaRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Apellido).NotEmpty().MaximumLength(150);
        RuleFor(x => x.DNI).NotEmpty().MaximumLength(20);
        RuleFor(x => x.FechaNacimiento).NotEmpty().LessThan(DateTime.UtcNow);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Password).DebeCumplirPoliticaDeContrasena();
    }
}
