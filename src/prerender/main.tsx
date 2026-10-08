/* Prerender entry, built to a standalone Node script
 * (vite.prerender.config.ts) and run by `pnpm build`. Renders the app to a
 * static string and rewrites dist/index.html from the same template the dev
 * server uses, minus the client script — the math ships as plain MathML in
 * the HTML and the page needs no JavaScript at all. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToString } from "solid-js/web";
import App from "../App";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(resolve(projectRoot, "src/index.html"), "utf8");
const app = renderToString(() => <App />);

const page = template
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>\s*/g, "")
    // Replacer function: `app` is markup and may contain `$&`-style
    // sequences that a plain replacement string would interpret.
    .replace('<div id="root"></div>', () => `<div id="root">${app}</div>`);

if (!page.includes(app)) {
    throw new Error(
        'prerender: no <div id="root"></div> matched in src/index.html',
    );
}

writeFileSync(resolve(projectRoot, "dist/index.html"), page);
console.log(
    `wrote dist/index.html (${page.length} bytes, math as static MathML)`,
);
