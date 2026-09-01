import { beforeEach, describe, expect, it, vi } from "vitest";

// `apiFetch` lee la cookie de sesión con `next/headers`, que solo existe dentro
// del runtime de Next. Se reemplaza por un stub para poder ejercitar la lógica
// de red y de normalización fuera de un request real.
vi.mock("@/lib/auth", () => ({
  getSessionToken: vi.fn(async () => "token-de-prueba"),
}));

const { apiFetchList, ApiError } = await import("@/lib/api");

function respuestaJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

/**
 * Regresión del bug que dejaba `/reservas` completamente caída con
 * "espacios.map is not a function": la API devuelve `PagedResult` en unos
 * endpoints y array plano en otros, sin una regla deducible de la ruta, y la
 * pantalla tipaba la respuesta como array.
 */
describe("apiFetchList", () => {
  it("devuelve los items cuando la respuesta viene paginada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuestaJson({
          items: [{ id: "1" }, { id: "2" }],
          page: 1,
          pageSize: 20,
          totalCount: 2,
        }),
      ),
    );

    await expect(apiFetchList<{ id: string }>("/api/espacios")).resolves.toEqual([
      { id: "1" },
      { id: "2" },
    ]);
  });

  it("devuelve la respuesta tal cual cuando ya es un array plano", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuestaJson([{ id: "a" }])));

    await expect(
      apiFetchList<{ id: string }>("/api/configuracion/categorias"),
    ).resolves.toEqual([{ id: "a" }]);
  });

  it("devuelve un array vacío cuando la respuesta paginada no trae items", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuestaJson({ page: 1, totalCount: 0 })));

    await expect(apiFetchList("/api/espacios")).resolves.toEqual([]);
  });

  it("no traga los errores de la API: siguen propagándose como ApiError", async () => {
    // Importa que un 403 no se confunda con "lista vacía": las pantallas
    // distinguen sin permiso de sin resultados y muestran cosas distintas.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => respuestaJson({ message: "Prohibido" }, 403)),
    );

    await expect(apiFetchList("/api/espacios")).rejects.toBeInstanceOf(ApiError);
  });
});
