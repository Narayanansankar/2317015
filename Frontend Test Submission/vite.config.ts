import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// app must run on localhost:3000 as required
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // browser calling the eval server directly can hit CORS/network issues
    // so instead the browser calls our own dev server at /api/notifications,
    // and vite forwards that request to the real API from node (no CORS there)
    proxy: {
      "/api/notifications": {
        target: "http://4.224.186.213",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/notifications/, "/evaluation-service/notifications"),
      },
    },
  },
  // logging-middleware is a local "file:" package (CommonJS build), force
  // vite to pre-bundle it so it works as a normal ESM import in the browser
  optimizeDeps: {
    include: ["logging-middleware"],
  },
});
