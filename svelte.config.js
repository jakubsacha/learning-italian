import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    // Ostrzeżenia dostępności traktujemy poważnie, nie wyciszamy ich.
    runes: true,
  },
};
