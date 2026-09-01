import { defineConfig } from "vitest/config";

/**
 * Configuración de Vitest para el frontend.
 *
 * No se usa `@vitejs/plugin-react`: su árbol de dependencias entra en conflicto
 * con la versión de Babel del proyecto, y para correr tests no aporta nada — su
 * función es Fast Refresh, que solo importa en el dev server. La transformación
 * de JSX/TSX la resuelve el transformador nativo de Vite.
 */
export default defineConfig({
  resolve: {
    // Resuelve el alias `@/*` de `tsconfig.json` dentro de los tests, sin
    // duplicar la configuración ni sumar el plugin `vite-tsconfig-paths`
    // (Vite ya lo soporta de forma nativa).
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
    // El pool por defecto (`forks`) queda colgado en Windows con
    // "Timeout waiting for worker to respond" y la corrida termina sin ejecutar
    // ningún test. Con hilos arranca normal.
    pool: "threads",
  },
});
