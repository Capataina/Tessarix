import { defineConfig } from "vitest/config";

/**
 * Unit-test layer (the "L1" of the testing framework). Pure-logic only — node
 * environment, no browser, no MDX — so it runs in milliseconds. Browser-driven
 * structural / interaction / vision testing lives in e2e/audit.mjs.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
