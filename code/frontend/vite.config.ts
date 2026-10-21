import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: process.env.VITE_DEV_PORT ? Number(process.env.VITE_DEV_PORT) : undefined,
    strictPort: true,
    proxy: process.env.BACKEND_ORIGIN ? {
      "/api": { target: process.env.BACKEND_ORIGIN, changeOrigin: true, xfwd: true },
    } : undefined,
    fs: {
      allow: [path.resolve(__dirname, "..")],
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    },
    hmr: {
      overlay: false,
      clientPort: process.env.FRONTEND_PORT ? Number(process.env.FRONTEND_PORT) : undefined,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
