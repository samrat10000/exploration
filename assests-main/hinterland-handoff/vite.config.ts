import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 2600, // three + rapier wasm are big by nature; split below keeps app code separate
    rollupOptions: {
      output: { manualChunks: { three: ["three", "@react-three/fiber"], rapier: ["@react-three/rapier"] } }
    }
  }
});
