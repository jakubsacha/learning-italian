import { resolve } from "node:path";
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
    rollupOptions: {
      // Cztery strony: kurs włoski w katalogu głównym, angielski Marty w /marta/,
      // historia w /historia/ i fiszki z angielskiego (Unit 2) w /angielski/.
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        marta: resolve(import.meta.dirname, "marta/index.html"),
        historia: resolve(import.meta.dirname, "historia/index.html"),
        angielski: resolve(import.meta.dirname, "angielski/index.html"),
      },
    },
  },
});
