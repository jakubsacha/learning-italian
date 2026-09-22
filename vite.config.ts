import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// GitHub Pages serwuje projekt z podkatalogu, więc ścieżka bazowa nie może być "/".
const base = process.env["BASE_PATH"] ?? "/learning-italian/";

export default defineConfig({
  base,
  plugins: [svelte()],
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
});
