import { getSessionToken } from "@/lib/auth";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Cliente fetch server-side hacia la API .NET (`API_BASE_URL`), pensado para
 * usarse desde Server Components (lecturas) y Server Actions (mutaciones) de
 * Etapa 1 en adelante. Adjunta el Bearer token de la cookie httpOnly
 * (`getSessionToken`, `lib/auth.ts`) y normaliza los errores del backend en
 * un `Error` con el mensaje que haya devuelto (`{ message }`), para que el
 * caller lo capture y lo muestre en el formulario/listado correspondiente.
 *
 * No usarse desde Client Components: el token nunca debe llegar al browser.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token ?? ""}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[apiFetch] No se pudo contactar la API .NET (${path}):`, error);
    throw new Error("No se pudo conectar con el servidor. Intentá nuevamente más tarde.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      (data as { message?: string } | null)?.message ??
      `Error ${response.status} al comunicarse con el servidor.`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Variante que devuelve la respuesta cruda (sin parsear JSON), para
 * endpoints que devuelven binarios (ej. el PDF del carnet de socio).
 */
export async function apiFetchRaw(path: string, init?: RequestInit): Promise<Response> {
  const token = await getSessionToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token ?? ""}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[apiFetchRaw] No se pudo contactar la API .NET (${path}):`, error);
    throw new Error("No se pudo conectar con el servidor. Intentá nuevamente más tarde.");
  }

  return response;
}

/**
 * Variante de `apiFetch` para bodies `multipart/form-data` (ej.
 * `POST /api/comunicaciones/{id}/adjuntos`, Etapa 4 — hasta ahora ningún
 * endpoint del frontend subía archivos binarios). A diferencia de `apiFetch`,
 * NO fuerza `Content-Type: application/json` — con un body `FormData`, fetch
 * (Node/undici) arma el header `multipart/form-data; boundary=...` solo si no
 * se lo pisamos manualmente.
 */
export async function apiFetchForm<T>(path: string, formData: FormData): Promise<T> {
  const token = await getSessionToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      body: formData,
      headers: {
        Authorization: `Bearer ${token ?? ""}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[apiFetchForm] No se pudo contactar la API .NET (${path}):`, error);
    throw new Error("No se pudo conectar con el servidor. Intentá nuevamente más tarde.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message =
      (data as { message?: string } | null)?.message ??
      `Error ${response.status} al comunicarse con el servidor.`;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
