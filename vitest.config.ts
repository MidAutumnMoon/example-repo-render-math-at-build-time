import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";
import { viteMathPlugin } from "./math-plugin.ts";

// Standalone so tests run from the project root regardless of the app
// config's `root: src/`. The math plugin must run before solid's transform,
// or <Math> in components would hit the throwing stub.
export default defineConfig({
    plugins: [viteMathPlugin(), solid()],
    test: {
        environment: "happy-dom",
        include: ["src/**/*.test.ts?(x)", "math-plugin.test.ts"],
    },
});
