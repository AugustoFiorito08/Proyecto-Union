import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta lo renderizado entre tests: sin esto, los componentes de un test
// quedan en el DOM y las consultas del siguiente encuentran nodos duplicados.
afterEach(() => {
  cleanup();
});
