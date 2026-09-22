import { defineConfig } from "vitest/config";

// Logika domenowa nie dotyka DOM-u, więc testy jednostkowe chodzą w Node i trwają milisekundy.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
