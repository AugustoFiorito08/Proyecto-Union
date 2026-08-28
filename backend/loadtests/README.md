# Pruebas de carga (Etapa 7)

SPEC.md §6 pide "pruebas de carga sobre generación batch de cuotas y webhook de Mercado
Pago", sin más detalle — el alcance concreto (qué medir, con qué herramienta, umbrales de
partida) se definió en la conversación de la tarea, no en el SPEC. Son herramientas de
tooling/testing, no funcionalidad de producto.

Requiere el stack completo levantado: `docker compose up -d` desde la raíz del repo
(servicios `postgres` en `:5433`, `api` en `:5000`).

## 1. Batch de generación de cuotas (`POST /api/cuotas/generar-periodo`)

Test xUnit (`tests/ProyectoUnion.Application.Tests/CuotasBatchLoadTests.cs`) que siembra
~5.000 Socios individuales Activos contra el Postgres real de Docker y cronometra el batch
completo. Instancia `CuotasController` directamente contra el mismo `ApplicationDbContext`
(mismo patrón que otros tests de integración del repo, ej. `ReportesControllerTests`) en
lugar de pegarle por HTTP — mide el costo real de EF Core + Npgsql sin mezclarlo con el
overhead fijo del pipeline de ASP.NET Core, que es independiente del tamaño del batch.

Está marcado con `[Trait("Category", "LoadTest")]` para no correr junto a la suite rápida
(un `dotnet test` sin filtro SÍ la ejecuta igual — hay que excluirla explícitamente):

```bash
# Desde backend/. Suite rápida (46 tests), excluye la prueba de carga:
dotnet test --filter "Category!=LoadTest"

# Solo la prueba de carga, contra el Postgres real de Docker:
dotnet test --filter "Category=LoadTest"
```

El test limpia sus propios datos al final (`IAsyncLifetime.DisposeAsync`): borra las Cuotas
del período `2027-01` (exclusivo de esta prueba, cascadea a CuotaDetalle) y los Socios con
prefijo `NumeroSocio` `LOADTEST-`.

El umbral (`UmbralMaximoSegundos = 15` en el archivo) es un valor de partida ajustable, no un
SLA — el test también imprime el tiempo real medido por consola aunque el assert pase cómodo.

**Nota técnica**: el batch también recorre Grupos Familiares activos ya existentes en la base
de dev, cuyos datos médicos cifrados (RN-SEG-01) fueron cifrados con la clave de Data
Protection persistente real de la API (volumen Docker `dataprotection-keys`). El test copia
esa clave desde el contenedor `proyecto-union-api-1` en vivo (`docker cp`) para poder
descifrarlos — sin eso, tira `CryptographicException` al intentar usar una clave efímera
nueva contra datos cifrados con otra clave.

## 2. Webhook de Mercado Pago (`POST /api/pagos/mercadopago/webhook`)

Script de k6 (`loadtests/webhook-mercadopago.js`): rampa a 20 VUs sostenidos ~30s.

```bash
# Desde backend/.
docker run --rm -i grafana/k6 run - < loadtests/webhook-mercadopago.js
```

**Limitación real de esta prueba** (documentada en el propio script): en este entorno
`MercadoPago:AccessToken` y `MercadoPago:WebhookSecret` están vacíos (`docker-compose.yml`).
Con eso, `PagosController.Webhook` toma siempre el camino de salida temprana: parsea el JSON,
valida `Type=="payment"` y `Data.Id`, salta la validación de firma (secreto vacío), ve
`_mercadoPagoClient.EstaConfigurado == false`, loguea un warning y responde `200` — sin tocar
Cuota/Reserva. Esta prueba mide throughput/latencia de **ese camino corto** (parseo + salida
temprana), no la cascada real de confirmación de pago, que requeriría credenciales reales de
Mercado Pago inexistentes en este entorno.

El script apunta a `http://host.docker.internal:5000/...` — no `http://localhost:5000/...` —
porque el script corre dentro del contenedor de k6, donde `localhost` es el propio contenedor,
no el host. `host.docker.internal` resuelve al host de Docker Desktop, donde la API tiene el
puerto 5000 publicado.
