namespace ProyectoUnion.Application.Dtos.Auth;

public sealed record LoginResponse(string AccessToken, string RefreshToken, int ExpiresIn);
