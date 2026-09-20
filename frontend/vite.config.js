import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      filename: "service-worker.js",
      manifest: false, // keep using public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,png,svg,ico}"],
        navigateFallback: "index.html",
        mode: "development",
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
