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
        RuleFor(x => x.Genero).MaximumLength(20);
        RuleFor(x => x.Telefono).MaximumLength(50);
        RuleFor(x => x.Domicilio).MaximumLength(200);
        RuleFor(x => x.Localidad).MaximumLength(100);
        RuleFor(x => x.Provincia).MaximumLength(100);
    }
}
