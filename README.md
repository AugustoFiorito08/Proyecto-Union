# Proyecto Unión — Sistema de Gestión de Club

Sistema de gestión integral para el Club Atlético Unión (CAU): socios, grupos familiares, actividades, reservas de espacios, cobranza de cuotas, comunicaciones institucionales, control de acceso físico por QR y un portal público de solicitud de membresía.

La especificación funcional y técnica completa vive en [`SPEC.md`](./SPEC.md) — roles, reglas de negocio, modelo de datos, endpoints y el estado real de cada etapa de implementación (qué está hecho, qué quedó documentado como límite conocido).

## Stack

- **Backend**: .NET 8 / ASP.NET Core Web API, EF Core + Npgsql, Clean Architecture (Domain → Application → Infrastructure → API).
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn.
- **Base de datos**: PostgreSQL.
- **Almacenamiento de archivos**: MinIO (S3-compatible).

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo. No hace falta tener .NET ni Node instalados en la máquina — todo corre en contenedores.

## Cómo levantar el proyecto

Desde la raíz del repo:

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (build de las imágenes + descarga de Postgres/MinIO). Al terminar, la base de datos se migra y se siembra sola con datos de ejemplo (roles, permisos, un usuario SuperAdmin, categorías, dos socios de prueba).

Cuando los 4 contenedores estén arriba:

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:3001 |
| API (Swagger) | http://localhost:5000/swagger |
| Consola de MinIO | http://localhost:9001 (usuario/clave: `minioadmin` / `minioadmin`) |

### Login de prueba

| Rol | Email | Contraseña |
|---|---|---|
| SuperAdministrador | `admin@clubunion.local` | `ClubUnion#2026` |

Desde ahí se puede crear acceso a los socios de ejemplo, dar de alta instructores, etc. — ver `SPEC.md` §2 para la matriz completa de roles y permisos.

### Apagar / reiniciar

```bash
docker compose down          # apaga los contenedores, conserva los datos
docker compose up -d --build # vuelve a levantar (rebuildea si hay cambios de código)
```

Los datos de Postgres y MinIO persisten en volúmenes de Docker entre reinicios. Para arrancar de cero:

```bash
docker compose down -v
```

## Integraciones externas (sin credenciales en este entorno)

Mercado Pago (pagos), el envío de Email (SMTP) y WhatsApp Business están implementados pero **sin credenciales configuradas** en `docker-compose.yml` — es un entorno de desarrollo local, no un ambiente con proveedores reales contratados. Sin esas credenciales, esas funciones responden con un error claro en vez de fallar en silencio (ver el detalle en `SPEC.md`, Etapas 3 y 4). Para probarlas de verdad, hay que completar las variables de entorno correspondientes en `docker-compose.yml` (`MercadoPago__*`, `Email__Smtp__*`, `WhatsApp__*`) con credenciales propias.

## Límites de seguridad conocidos (fuera de alcance por decisión explícita)

La revisión de seguridad OWASP Top 10 de la Etapa 7 (detalle completo en `SPEC.md` §6) implementó rate limiting, lockout de login, validación de adjuntos, firma obligatoria del webhook de Mercado Pago y actualización de dependencias vulnerables. Quedaron fuera, documentados como checklist de un futuro despliegue de producción (son gaps de configuración de entorno, no de código):

- El secreto JWT vive hardcodeado en `appsettings.Development.json` — es un valor de desarrollo (el propio archivo dice "CAMBIAR EN PRODUCCIÓN"). En producción debe venir de un secret manager o variable de entorno, nunca committeado.
- CORS (`Program.cs`) tiene los orígenes hardcodeados a `http://localhost:3000`/`3001` — no hay todavía un entorno de producción para el que definir el origen real.
- No hay security headers configurados (HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options).

## Estado del proyecto

Etapas 0 a 6 del plan de implementación completas y verificadas en vivo (infraestructura/autenticación, Socios, Actividades/Reservas, Finanzas, Comunicaciones, Control de Acceso, Solicitudes de Membresía). El detalle etapa por etapa, con qué se verificó y qué quedó como límite conocido, está en `SPEC.md` §6.
