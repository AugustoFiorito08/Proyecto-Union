import http from 'k6/http';
import { check } from 'k6';

// Prueba de carga (SPEC.md §6, Etapa 7 — "pruebas de carga sobre [...] webhook de Mercado
// Pago", alcance definido en la conversación de la tarea) sobre
// POST /api/pagos/mercadopago/webhook.
//
// IMPORTANTE — qué mide realmente esta prueba (ver backend/loadtests/README.md): en este
// entorno "MercadoPago:AccessToken" y "MercadoPago:WebhookSecret" están vacíos
// (docker-compose.yml, servicio "api"). Con AccessToken vacío, PagosController.Webhook toma
// SIEMPRE el camino de salida temprana: parsea el JSON, valida Type=="payment" y Data.Id
// presente, salta la validación de firma (WebhookSecret vacío) y devuelve 200 sin llegar a
// tocar Cuota/Reserva (_mercadoPagoClient.EstaConfigurado es false). Esta prueba mide el
// throughput/latencia de ESE camino corto — no la cascada real de confirmación de pago, que
// requeriría credenciales reales de Mercado Pago que no existen en este entorno.

export const options = {
  scenarios: {
    rampa_webhook: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 20 }, // rampa hasta 20 VUs
        { duration: '30s', target: 20 }, // sostenido en 20 VUs
        { duration: '5s', target: 0 }, // baja a 0
      ],
    },
  },
  thresholds: {
    // Valores de partida ajustables — NO son un SLA contractual, solo un piso razonable
    // para detectar una degradación grave en este camino de salida temprana.
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// "localhost" NO apunta a la API cuando este script corre dentro del contenedor de k6 (ver
// backend/loadtests/README.md) — "host.docker.internal" resuelve al host de Docker Desktop,
// donde la API tiene el puerto 5000 publicado (docker-compose.yml).
const URL = 'http://host.docker.internal:5000/api/pagos/mercadopago/webhook';

export default function () {
  // data.id único por request, forma real de una notificación de MP para el evento
  // "payment" (ver MercadoPagoWebhookNotification.cs — el binder de ASP.NET Core es
  // case-insensitive, así que "type"/"data"/"id" en minúscula funciona igual).
  const payload = JSON.stringify({
    type: 'payment',
    data: {
      id: `${Date.now()}-${Math.floor(Math.random() * 1_000_000_000)}`,
    },
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(URL, payload, params);

  check(res, {
    'status es 200': (r) => r.status === 200,
  });
}
