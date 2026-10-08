import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { viteMathPlugin } from "./math-plugin.ts";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(projectRoot, "src");

export default defineConfig({
    root: sourceRoot,
    publicDir: resolve(projectRoot, "public"),
    plugins: [viteMathPlugin(), solid()],
    build: {
        outDir: resolve(projectRoot, "dist"),
        emptyOutDir: true,
    },
});
