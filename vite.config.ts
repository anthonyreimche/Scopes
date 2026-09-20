import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
    // Safelight injects its own React at runtime via api.react — never bundle one.
    rollupOptions: { external: ["react", "react-dom"] },
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
