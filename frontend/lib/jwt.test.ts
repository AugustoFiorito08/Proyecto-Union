import { describe, expect, it } from "vitest";

import { decodeJwtPayload, nombreParaMostrar, pickClaim, type SessionClaims } from "@/lib/jwt";

/** Arma un JWT de mentira con el payload dado. La firma no importa: `decodeJwtPayload` no la valida. */
function jwtCon(payload: Record<string, unknown>): string {
  const base64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.firma-irrelevante`;
}

describe("decodeJwtPayload", () => {
  it("lee el payload de un token bien formado", () => {
    const token = jwtCon({ email: "ana@club.com", role: "Administrador" });
    expect(decodeJwtPayload<SessionClaims>(token)).toMatchObject({
      email: "ana@club.com",
      role: "Administrador",
    });
  });

  it("devuelve null en vez de tirar cuando el token es basura", () => {
    // Importa que no lance: se ejecuta en el render de pantallas y una excepción
    // acá tumbaría el layout entero en vez de degradar a "sin sesión".
    expect(decodeJwtPayload("no-es-un-jwt")).toBeNull();
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("a.b.c")).toBeNull();
  });
});

describe("pickClaim", () => {
  it("prefiere la primera clave presente en el orden dado", () => {
    const claims: SessionClaims = { unique_name: "segunda", name: "primera" };
    expect(pickClaim(claims, ["name", "unique_name"])).toBe("primera");
  });

  it("cae a las claves largas de ASP.NET Core cuando no está la corta", () => {
    const claims: SessionClaims = {
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "Desde ClaimTypes",
    };
    expect(
      pickClaim(claims, ["name", "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]),
    ).toBe("Desde ClaimTypes");
  });

  it("ignora valores vacíos o que no son string", () => {
    const claims: SessionClaims = { name: "", role: 42 as unknown as string };
    expect(pickClaim(claims, ["name", "role"])).toBeUndefined();
  });
});

describe("nombreParaMostrar", () => {
  // El backend manda el email completo en el claim `name`, así que no alcanza
  // con preferir ese claim: hay que recortar igual. Este caso es el que
  // mostraba "Buen día, admin@clubunion.local" en el panel de inicio.
  it("recorta el email aunque venga en el claim `name`", () => {
    expect(nombreParaMostrar({ name: "admin@clubunion.local" })).toBe("Admin");
  });

  it("recorta el email cuando solo está el claim `email`", () => {
    expect(nombreParaMostrar({ email: "ana.garcia@club.com" })).toBe("Ana.garcia");
  });

  it("deja intacto un nombre real que no es una dirección", () => {
    expect(nombreParaMostrar({ name: "Ana García" })).toBe("Ana García");
  });

  it("devuelve string vacío sin sesión o sin claims útiles", () => {
    expect(nombreParaMostrar(null)).toBe("");
    expect(nombreParaMostrar({})).toBe("");
  });
});
