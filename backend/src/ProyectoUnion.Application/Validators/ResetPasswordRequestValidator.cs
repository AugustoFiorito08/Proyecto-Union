using FluentValidation;
using ProyectoUnion.Application.Dtos.Auth;

namespace ProyectoUnion.Application.Validators;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NuevaPassword).DebeCumplirPoliticaDeContrasena();
    }
}
