# SPEC.md — Proyecto Unión: Sistema de Gestión Integral de Club

> Documento vivo. Toda decisión de arquitectura y stack vive acá. No se avanza de fase sin marcar los checklists de la fase anterior.

---

## 1. Visión General y Roles

**Proyecto Unión** es un sistema de gestión integral para un club (socios, cuotas, actividades, empleados). Se construye en dos fases:

- **Fase 1:** Web responsive (escritorio + móvil) para gestión interna (Admin/Empleado) y portal básico de Socio.
- **Fase 2:** App móvil del socio, consumiendo la misma API REST (arquitectura API-First y Clean Architecture desde el día uno).

### Roles del sistema

| Rol | Descripción | Alcance típico |
|---|---|---|
| **Admin** | Control total del sistema. Gestiona empleados, configuración de cuotas, actividades, reportes financieros. | CRUD completo sobre todos los recursos. |
| **Empleado** | Personal operativo (recepción, administración). Gestiona socios, registra pagos, inscribe a actividades. | CRUD limitado (sin gestión de empleados ni configuración global). |
| **Socio** | Usuario final del club. Consulta su estado de cuenta, paga cuotas, se inscribe a actividades. | Solo lectura/acciones sobre sus propios datos. |

**Regla de autorización base:** todo endpoint valida rol vía `[Authorize(Roles = "...")]` (o política equivalente) sobre el JWT emitido en el login. Un Socio nunca accede a datos de otro Socio. Un Empleado nunca gestiona Empleados ni Admins.

---

## 2. Arquitectura de Software y Stack Completo

### Arquitectura: Clean Architecture (API-First)

Cuatro capas con dependencias apuntando siempre hacia adentro (`API → Infrastructure → Application → Domain`; `Domain` no depende de nada):

```
┌─────────────────────────────────────────────┐
│  ProyectoUnion.API          (Controllers,    │
│                               DI, Program.cs) │
├─────────────────────────────────────────────┤
│  ProyectoUnion.Infrastructure                │
│  (EF Core, DbContext, Repositorios, JWT,     │
│   Identity, servicios externos)              │
├─────────────────────────────────────────────┤
│  ProyectoUnion.Application                    │
│  (DTOs, interfaces de servicios/repositorios, │
│   validadores, lógica de casos de uso)        │
├─────────────────────────────────────────────┤
│  ProyectoUnion.Domain                         │
│  (Entidades, enums, reglas de negocio puras,  │
│   sin dependencias externas)                  │
└─────────────────────────────────────────────┘
```

*Nota de alcance:* para el tamaño de este dominio (un club, no una fintech), `Application` se implementa con **Servicios + DTOs simples**, no con CQRS/MediatR. Si la complejidad crece (por ejemplo, reportes financieros pesados en Fase 3), MediatR es la evolución natural sin romper capas — pero no se introduce antes de necesitarlo.

### Backend / API
- **Runtime:** .NET 8 (LTS)
- **Framework:** ASP.NET Core Web API — **Controllers** con enrutamiento por atributos (no Minimal APIs).
  - *Por qué Controllers y no Minimal APIs:* con 3 roles y ~6 dominios, los Controllers dan agrupación natural por recurso, filtros de autorización declarativos (`[Authorize]`), y binding de DTOs consistente. Minimal APIs brillan en microservicios chicos de pocos endpoints; acá el volumen de endpoints justifica la estructura de Controllers.
- **ORM:** Entity Framework Core 8
- **Base de datos:** **PostgreSQL** (proveedor `Npgsql.EntityFrameworkCore.PostgreSQL`) como default.
  - *Por qué Postgres sobre SQL Server:* multiplataforma, sin costo de licencia, y mejor integración con Docker para desarrollo local. La capa `Infrastructure` aísla el proveedor detrás de `ApplicationDbContext`, así que **migrar a SQL Server es swap de paquete NuGet + connection string**, no un rediseño — si la infraestructura del club ya es Windows/Azure SQL, el cambio es de bajo costo.
- **Auth:** ASP.NET Core Identity (gestión de usuarios y roles) + JWT Bearer tokens (access + refresh token) para las APIs.
- **Validación:** FluentValidation sobre los DTOs de entrada.
- **Documentación de API:** Swagger/OpenAPI (`Swashbuckle.AspNetCore`) con esquema de seguridad JWT — el contrato que consume tanto Next.js como, en Fase 2, la app móvil.
- **Mapeo:** Mapster o AutoMapper (Entity ↔ DTO).

### Frontend Web
- **Framework:** Next.js 14+ (App Router) + TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Estado servidor:** TanStack Query, consumiendo la API .NET vía `fetch`
- **Cliente API tipado:** generado automáticamente desde el `swagger.json` de la API (`openapi-typescript` u `NSwag`) — evita mantener tipos duplicados a mano entre C# y TypeScript.
- **Formularios:** React Hook Form + Zod
- **Auth en el cliente:** JWT guardado en cookie `httpOnly` (seteada por un route handler de Next.js que hace de proxy al login de la API), `middleware.ts` protege rutas por rol.

### Infraestructura y tooling
- **Contenedores:** Docker + Docker Compose (`api`, `db`, `web`) para desarrollo local.
- **Migraciones:** EF Core Migrations (`dotnet ef migrations add` / `database update`).
- **CI:** GitHub Actions — `dotnet build && dotnet test` para el backend, `npm run lint && npm run build` para el frontend.
- **Testing backend:** xUnit + FluentAssertions (unit), WebApplicationFactory (integración sobre la API).
- **Testing frontend:** Vitest + Testing Library, Playwright para e2e críticos (login, pago de cuota).

---

## 3. Estructura de la Solución .NET y del Frontend

### Repositorio (raíz)

```
proyecto-union/
├── backend/
│   ├── ProyectoUnion.sln
│   └── src/
│       ├── ProyectoUnion.Domain/
│       ├── ProyectoUnion.Application/
│       ├── ProyectoUnion.Infrastructure/
│       └── ProyectoUnion.API/
│   └── tests/
│       ├── ProyectoUnion.Application.Tests/
│       └── ProyectoUnion.API.IntegrationTests/
├── frontend/
│   └── (Next.js app, ver detalle abajo)
├── docker-compose.yml
├── CLAUDE.md
├── README.md
└── SPEC.md
```

### `backend/` — detalle por proyecto

```
ProyectoUnion.Domain/
├── Entities/
│   ├── Socio.cs
│   ├── Empleado.cs
│   ├── Cuota.cs
│   ├── Pago.cs
│   ├── Actividad.cs
│   └── Inscripcion.cs
├── Enums/
│   ├── EstadoSocio.cs
│   ├── EstadoCuota.cs
│   └── MetodoPago.cs
└── Common/                       # BaseEntity, interfaces de dominio

ProyectoUnion.Application/
├── DTOs/
│   ├── Socios/  (SocioDto, CreateSocioDto, UpdateSocioDto)
│   ├── Cuotas/
│   ├── Actividades/
│   └── Auth/
├── Interfaces/
│   ├── Repositories/             # ISocioRepository, ICuotaRepository...
│   └── Services/                 # ISocioService, ICuotaService...
├── Services/                     # implementación de casos de uso
├── Validators/                   # FluentValidation
└── Mappings/                     # perfiles Mapster/AutoMapper

ProyectoUnion.Infrastructure/
├── Persistence/
│   ├── ApplicationDbContext.cs
│   ├── Configurations/           # IEntityTypeConfiguration<T> por entidad
│   └── Migrations/
├── Repositories/                 # implementaciones EF Core
├── Identity/                     # ApplicationUser, JWT token generator
└── DependencyInjection.cs        # extension method AddInfrastructure()

ProyectoUnion.API/
├── Controllers/
│   ├── AuthController.cs
│   ├── SociosController.cs
│   ├── EmpleadosController.cs
│   ├── CuotasController.cs
│   ├── PagosController.cs
│   └── ActividadesController.cs
├── Middleware/                   # manejo global de excepciones
├── Program.cs                    # DI, JWT, Swagger, CORS
└── appsettings.json
```

### `frontend/` — Next.js App Router

```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/               # Admin + Empleado
│   │   ├── socios/
│   │   ├── cuotas/
│   │   ├── actividades/
│   │   ├── empleados/
│   │   └── layout.tsx
│   ├── (socio)/                   # portal del socio
│   │   └── mi-cuenta/page.tsx
│   ├── api/auth/                  # route handlers proxy al login de la API (setea cookie httpOnly)
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui
│   └── features/                  # componentes por dominio (socios/, cuotas/...)
├── lib/
│   ├── api-client/                # cliente generado desde swagger.json
│   ├── auth.ts
│   └── utils.ts
├── hooks/
├── middleware.ts                  # protección de rutas por rol (lee el JWT de la cookie)
└── public/
```

*(La app móvil de Fase 2 se agrega como carpeta hermana, ej. `mobile/`, consumiendo el mismo `swagger.json`.)*

---

## 4. Modelo de Datos (EF Core — Entities & DbContext)

### Entidades de dominio

**`Socio`**
```csharp
public class Socio
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }              // FK → ApplicationUser
    public string Nombre { get; set; } = default!;
    public string Apellido { get; set; } = default!;
    public string Dni { get; set; } = default!;    // unique
    public DateOnly FechaNacimiento { get; set; }
    public string? Telefono { get; set; }
    public string? Direccion { get; set; }
    public string Categoria { get; set; } = default!; // ACTIVO, VITALICIO, CADETE
    public DateOnly FechaIngreso { get; set; }
    public EstadoSocio Estado { get; set; }

    public ICollection<Cuota> Cuotas { get; set; } = [];
    public ICollection<Inscripcion> Inscripciones { get; set; } = [];
}
```

**`Empleado`**
```csharp
public class Empleado
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }               // FK → ApplicationUser
    public string Nombre { get; set; } = default!;
    public string Apellido { get; set; } = default!;
    public string Dni { get; set; } = default!;     // unique
    public string Puesto { get; set; } = default!;
    public DateOnly FechaIngreso { get; set; }

    public ICollection<Actividad> ActividadesComoInstructor { get; set; } = [];
}
```

**`Cuota`**
```csharp
public class Cuota
{
    public Guid Id { get; set; }
    public Guid SocioId { get; set; }               // FK → Socio
    public string Periodo { get; set; } = default!;  // "YYYY-MM"
    public decimal Monto { get; set; }
    public DateOnly FechaVencimiento { get; set; }
    public EstadoCuota Estado { get; set; }

    public Socio Socio { get; set; } = default!;
    public ICollection<Pago> Pagos { get; set; } = [];
}
```

**`Pago`**
```csharp
public class Pago
{
    public Guid Id { get; set; }
    public Guid CuotaId { get; set; }                // FK → Cuota
    public Guid SocioId { get; set; }                // FK → Socio
    public decimal Monto { get; set; }
    public DateTime FechaPago { get; set; }
    public MetodoPago MetodoPago { get; set; }
    public Guid RegistradoPorId { get; set; }         // FK → ApplicationUser

    public Cuota Cuota { get; set; } = default!;
}
```

**`Actividad`**
```csharp
public class Actividad
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = default!;
    public string? Descripcion { get; set; }
    public int CupoMaximo { get; set; }
    public string Horario { get; set; } = default!;
    public Guid? InstructorId { get; set; }           // FK → Empleado (nullable)

    public Empleado? Instructor { get; set; }
    public ICollection<Inscripcion> Inscripciones { get; set; } = [];
}
```

**`Inscripcion`** (N:M Socio↔Actividad con metadata)
```csharp
public class Inscripcion
{
    public Guid Id { get; set; }
    public Guid SocioId { get; set; }
    public Guid ActividadId { get; set; }
    public DateTime FechaInscripcion { get; set; }
    public EstadoInscripcion Estado { get; set; }      // ACTIVA, CANCELADA

    public Socio Socio { get; set; } = default!;
    public Actividad Actividad { get; set; } = default!;
}
```

### `ApplicationDbContext`

```csharp
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Socio> Socios => Set<Socio>();
    public DbSet<Empleado> Empleados => Set<Empleado>();
    public DbSet<Cuota> Cuotas => Set<Cuota>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<Actividad> Actividades => Set<Actividad>();
    public DbSet<Inscripcion> Inscripciones => Set<Inscripcion>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        // Configuraciones (índices únicos, precisión decimal, delete behavior)
        // viven en Infrastructure/Persistence/Configurations/*.cs, una por entidad.
    }
}
```

**Constraints clave a definir en las `IEntityTypeConfiguration<T>`:**
- `Socio.Dni` y `Empleado.Dni` → índice único.
- `Cuota` → índice único compuesto (`SocioId`, `Periodo`).
- `Inscripcion` → índice único compuesto (`SocioId`, `ActividadId`) filtrado por `Estado = ACTIVA`.
- `Pago.Monto` y `Cuota.Monto` → `decimal(10,2)`.
- `Actividad.InstructorId` → `OnDelete(DeleteBehavior.SetNull)` (si se da de baja el empleado, la actividad no se borra).

```
ApplicationUser (Identity) 1───1 Socio 1───N Cuota 1───N Pago
ApplicationUser (Identity) 1───1 Empleado 1───N Actividad (como instructor)
Socio N───N Actividad  (a través de Inscripcion)
```

---

## 5. Endpoints REST Principales (Controllers)

Prefijo base: `/api/v1`. Todos los endpoints (excepto `auth/login`) requieren `Authorization: Bearer <token>`.

### `AuthController`
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | Público | Login, devuelve access + refresh token |
| POST | `/auth/refresh` | Autenticado | Renueva access token |
| GET | `/auth/me` | Autenticado | Perfil del usuario logueado |

### `SociosController`
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/socios` | Admin, Empleado | Listado paginado/filtrado |
| GET | `/socios/{id}` | Admin, Empleado, Socio (propio) | Detalle |
| POST | `/socios` | Admin, Empleado | Alta de socio |
| PUT | `/socios/{id}` | Admin, Empleado | Edición |
| DELETE | `/socios/{id}` | Admin | Baja (soft delete → `Estado: INACTIVO`) |

### `CuotasController` / `PagosController`
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/socios/{id}/cuotas` | Admin, Empleado, Socio (propio) | Historial de cuotas |
| POST | `/cuotas/generar` | Admin | Genera cuotas del período para todos los socios activos |
| POST | `/cuotas/{id}/pagar` | Admin, Empleado, Socio (propio) | Registra un pago |
| GET | `/pagos` | Admin | Reporte de pagos (filtrable por fecha/socio) |

### `ActividadesController`
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/actividades` | Todos | Listado con cupos disponibles |
| POST | `/actividades` | Admin | Alta de actividad |
| PUT | `/actividades/{id}` | Admin | Edición |
| POST | `/actividades/{id}/inscribir` | Admin, Empleado, Socio (propio) | Inscribe al socio (valida cupo) |
| DELETE | `/inscripciones/{id}` | Admin, Empleado, Socio (propio) | Cancela inscripción |

### `EmpleadosController` (solo Admin)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/empleados` | Admin | Listado |
| POST | `/empleados` | Admin | Alta |
| PUT | `/empleados/{id}` | Admin | Edición |
| DELETE | `/empleados/{id}` | Admin | Baja |

---

## 6. Plan de Desarrollo por Fases

### Fase 0 — Setup y Arquitectura Base
- [ ] Crear `ProyectoUnion.sln` con los 4 proyectos (`Domain`, `Application`, `Infrastructure`, `API`) y referencias entre capas
- [ ] Configurar `ApplicationDbContext` (Identity + entidades) y primera migración EF Core
- [ ] Configurar Docker Compose (`postgres`, `api`, `web`)
- [ ] Configurar ASP.NET Core Identity + emisión de JWT (access + refresh)
- [ ] Configurar Swagger con esquema de seguridad Bearer
- [ ] Configurar CORS para permitir el origen de Next.js
- [ ] Crear proyecto Next.js (App Router, TS, Tailwind, shadcn/ui)
- [ ] Configurar generación del cliente TypeScript desde `swagger.json`
- [ ] Configurar CI en GitHub Actions (`dotnet build/test` + `npm run lint/build`)

### Fase 1 — Web Responsive (MVP)
**Auth y usuarios**
- [ ] `AuthController` (login, refresh) + guards por rol (`[Authorize(Roles=...)]`)
- [ ] CRUD de `Empleado` (solo Admin)
- [ ] Pantalla de login en Next.js + route handler que setea cookie `httpOnly` con el JWT
- [ ] `middleware.ts` de protección de rutas por rol

**Gestión de Socios**
- [ ] CRUD de `Socio` (Admin/Empleado)
- [ ] Listado con búsqueda y filtro por estado/categoría
- [ ] Vista de detalle de socio con historial de cuotas y pagos

**Cuotas y Pagos**
- [ ] Endpoint de generación automática de cuotas por período
- [ ] Registro de pago (marca cuota como `PAGADA`)
- [ ] Reporte de morosidad (cuotas `VENCIDA`)

**Actividades**
- [ ] CRUD de `Actividad`
- [ ] Inscripción/cancelación con validación de cupo (transacción EF Core)

**Portal de Socio (básico)**
- [ ] Login de socio
- [ ] Vista de "mi cuenta": cuotas, pagos, actividades inscriptas

**Cierre de Fase 1**
- [ ] Documentación Swagger completa y publicada
- [ ] Tests de integración (`WebApplicationFactory`) sobre endpoints críticos (auth, pagos)
- [ ] Deploy a ambiente de staging (API + Postgres + Next.js)

### Fase 2 — API-First Hardening + App Móvil de Socios
- [ ] Auditoría de contratos de API (versionado, paginación consistente, DTOs de respuesta estables)
- [ ] Endpoints optimizados para consumo móvil (payloads livianos, paginación por cursor si aplica)
- [ ] Decisión de stack móvil (React Native/Expo vs. .NET MAUI — evaluar reuso de skillset C# vs. ecosistema React ya usado en Next.js)
- [ ] Login y "mi cuenta" en la app móvil
- [ ] Pago de cuota desde la app (integración pasarela de pago)
- [ ] Inscripción a actividades desde la app
- [ ] Notificaciones push (vencimiento de cuota, confirmación de inscripción)
- [ ] Publicación en stores (TestFlight / Play Console interno)

### Fase 3 — Extras (post-MVP, sujeto a validación con el club)
- [ ] Reportes financieros avanzados (exportación PDF/Excel)
- [ ] Multi-sede / multi-instalación
- [ ] Panel de asistencia a actividades (check-in)
- [ ] Notificaciones por email (cuotas próximas a vencer)
- [ ] Evaluar introducción de CQRS/MediatR en `Application` si la lógica de reportes lo justifica

---

**Nota de proceso:** por `CLAUDE.md`, cada paso completado debe reflejarse marcando `[x]` en este documento antes de continuar con el siguiente.
