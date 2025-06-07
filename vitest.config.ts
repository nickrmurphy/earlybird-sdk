import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*"],
    watch: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "packages/**/*.test.ts",
        "packages/**/types/**/*.ts",
        "packages/**/*.d.ts",
        "**/node_modules/**",
        "**/coverage/**",
      ],
    },
  },
});
