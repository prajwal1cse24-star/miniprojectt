import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",
  plugins: [react()],
  server: {
    host: "localhost",
    proxy: {
      "/api": "http://127.0.0.1:5000",
      "/uploads": "http://127.0.0.1:5000",
    },
  },
});