import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: [
      "apps/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
    ],
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@shared": fileURLToPath(
        new URL("./packages/shared/src/index.ts", import.meta.url),
      ),
      "@shared/": fileURLToPath(
        new URL("./packages/shared/src/", import.meta.url),
      ),
      "@ui": fileURLToPath(new URL("./packages/ui/src/index.ts", import.meta.url)),
      "@ui/": fileURLToPath(new URL("./packages/ui/src/", import.meta.url)),
    },
  },
});
