import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Puerto 3000: es el origen que permite CORS_ORIGIN en el backend.
export default defineConfig({ plugins: [react()], server: { port: 3000 } });
