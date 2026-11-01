import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Puerto 3000: es el origen que permite CORS_ORIGIN en el backend.
// "test" configura las pruebas del front (Vitest + React Testing Library).
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/tests/setup.js" },
});