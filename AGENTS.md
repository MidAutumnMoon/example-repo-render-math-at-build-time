# AGENTS.md

## Project

Experiment: a `<Math>` Solid component whose LaTeX children are typeset to
MathML **at build time**, so no math renderer ever ships to the client.

Two layers make this work:

1. `math-plugin.ts` — `viteMathPlugin()` is a Vite plugin (`enforce: "pre"`)
   that runs before vite-plugin-solid's transform. Its Babel visitor calls
   `temml.renderToString` (the only math dependency, devDependencies only)
   at compile time and replaces `<Math>…</Math>` with
   `<span innerHTML={"…MathML…"} />`, which Solid compiles to a static
   template. It is deliberately NOT passed through vite-plugin-solid's
   `babel` option: under Vite 8 (Rolldown) that path does not reliably run
   user plugins before the Solid preset, and `<Math>` silently compiles to
   a runtime component call.
2. `src/prerender/main.tsx` — a Node script (built by
   `vite.prerender.config.ts`, which needs `solid({ ssr: true })` or
   vite-plugin-solid emits DOM-mode code even in the ssr environment) that
   runs the app through Solid's SSR `renderToString` and rewrites
   `dist/index.html` from the same template the dev server uses, minus the
   client `<script>`. The built page shows the math with JavaScript
   disabled.

`src/math.ts` is a marker module: it types `<Math>` for TypeScript and throws
if a build ever runs it for real.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server (math renders live, HMR included) |
| `pnpm build` | Client build + prerender: static `dist/index.html` with inline MathML |
| `pnpm check` | Type-check |
| `pnpm test` / `pnpm test:watch` | Vitest (plugin transform tests + app render test) |
| `pnpm lint` / `pnpm format` | oxlint / oxfmt |

## Verifying "no math JS shipped"

```bash
pnpm build
grep -c "<math" dist/index.html                 # > 0: math is in the HTML
grep -c "<script" dist/index.html               # 0: page needs no JS at all
grep -riE "temml|katex|mathjax" dist/ || echo ok # only CSS/font asset names may match
```

`dist/assets/*.js` (the unreferenced SPA bundle) contains the MathML only
as template-string data, never renderer code.

## Conventions & traps

- LaTeX with `{`, `}` or `<` must use a template literal child:
  `<Math>{String.raw`\frac{a}{b}`}</Math>`. Plain JSX text works for simple
  cases like `E = mc^2`.
- Dynamic children (`<Math>{expr}</Math>`) fail the build on purpose — they
  cannot be rendered at build time.
- `public/Temml-Local.css` + `public/Temml.woff2` are vendored from
  `temml`'s dist (MIT). Temml needs the font (10 KB) for correct glyphs on
  Chromium; system fonts have known defects there.
- Fallback if Temml ever stalls: KaTeX `renderToString(..., { output:
  "mathml" })` is a drop-in swap inside `math-plugin.ts`.

## Visual checks (occasional)

```bash
pnpm build && pnpm dlx http-server dist -p 4173 -a 127.0.0.1 &
playwright-cli open --browser=firefox about:blank
playwright-cli goto http://127.0.0.1:4173/
playwright-cli console    # expect 0 errors
playwright-cli screenshot --filename=/tmp/try-render.png
playwright-cli close
```
