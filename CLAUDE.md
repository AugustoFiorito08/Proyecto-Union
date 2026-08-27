# Reglas de Trabajo con Claude Code

## Reglas Obligatorias
1. **Regla #1:** Antes de escribir código, modificar archivos o proponer soluciones, SIEMPRE lee el archivo `SPEC.md`.
2. **Regla #2:** Cíñete estrictamente al stack tecnológico y a la arquitectura definidos en `SPEC.md`.
3. **Regla #3:** Avanzaremos fase por fase según el plan de desarrollo. No pases a la siguiente fase sin aprobación explícita.
4. **Regla #4:** Cada vez que terminemos un paso, actualiza el `SPEC.md` marcando `[x]` en el checklist correspondiente.

## Arquitectura General
- Web Responsive (Escritorio + Móvil) para la gestión.
- API-First (Backend desacoplado) para permitir más adelante la App Móvil nativa/híbrida del socio.
- Clean Architecture / Arquitectura en capas en el backend (`Domain` → `Application` → `Infrastructure` → `API`).

## Stack Tecnológico Obligatorio
- **Backend / API:** .NET 8 (C#), ASP.NET Core Web API (Controllers), Entity Framework Core, PostgreSQL como base de datos por defecto (swap a SQL Server soportado vía proveedor EF Core).
- **Frontend Web:** Next.js (TypeScript, App Router), Tailwind CSS, consumiendo la API .NET mediante un cliente tipado generado desde `swagger.json`.
- No introducir otro framework backend (Express, NestJS, etc.) ni otro framework frontend (Vue, Angular, etc.) sin actualizar primero este archivo y `SPEC.md`.