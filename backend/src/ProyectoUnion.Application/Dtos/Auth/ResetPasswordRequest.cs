namespace ProyectoUnion.Application.Dtos.Auth;

public sealed record ResetPasswordRequest(string Email, string Token, string NuevaPassword);
