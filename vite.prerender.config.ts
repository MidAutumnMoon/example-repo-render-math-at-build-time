import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import { viteMathPlugin } from "./math-plugin.ts";

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Builds the prerender entry as a standalone Node script. The math plugin
// inlines MathML at compile time, so the script only needs solid-js's SSR
// runtime — bundled in (noExternal) because plain Node would otherwise
// resolve solid-js/web to its client build.
export default defineConfig({
    // `ssr: true` makes vite-plugin-solid emit the SSR code path; without it
    // the plugin compiles `generate: "dom"` even inside the ssr environment
    // (vite-plugin-solid 2.11.14 behavior).
    plugins: [viteMathPlugin(), solid({ ssr: true })],
    build: {
        ssr: resolve(projectRoot, "src/prerender/main.tsx"),
        outDir: resolve(projectRoot, "dist-prerender"),
        emptyOutDir: true,
        rolldownOptions: {
            output: { format: "es", entryFileNames: "main.js" },
        },
    },
    environments: {
        ssr: {
            resolve: {
                noExternal: ["solid-js"],
                conditions: ["node", "solid"],
            },
        },
    },
});
