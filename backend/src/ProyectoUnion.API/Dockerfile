FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ProyectoUnion.sln ./
COPY src/ProyectoUnion.Domain/ProyectoUnion.Domain.csproj src/ProyectoUnion.Domain/
COPY src/ProyectoUnion.Application/ProyectoUnion.Application.csproj src/ProyectoUnion.Application/
COPY src/ProyectoUnion.Infrastructure/ProyectoUnion.Infrastructure.csproj src/ProyectoUnion.Infrastructure/
COPY src/ProyectoUnion.API/ProyectoUnion.API.csproj src/ProyectoUnion.API/
COPY tests/ProyectoUnion.Application.Tests/ProyectoUnion.Application.Tests.csproj tests/ProyectoUnion.Application.Tests/
RUN dotnet restore ProyectoUnion.sln

COPY . .
RUN dotnet publish src/ProyectoUnion.API/ProyectoUnion.API.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Development
EXPOSE 5000

ENTRYPOINT ["dotnet", "ProyectoUnion.API.dll"]
