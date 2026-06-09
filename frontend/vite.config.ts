import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 백엔드(Spring Boot)로 /api 프록시 — PMTiles Range 요청 및 글리프 서빙
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
