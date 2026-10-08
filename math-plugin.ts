import { transformAsync } from "@babel/core";
import type { NodePath, PluginObj } from "@babel/core";
import type * as BabelTypes from "@babel/types";
import type { Plugin as VitePlugin } from "vite";
import temml from "temml";

/**
 * Compile-time `<Math>` for Solid.
 *
 * The Babel plugin rewrites `<Math>…latex…</Math>` (imported from a marker
 * module whose path ends in `math`) into `<span innerHTML="…MathML…" />`,
 * so the LaTeX is typeset at build time and no renderer is ever shipped to
 * the client. Solid's compiler folds the static string into the element
 * template; in SSR mode it is emitted as raw markup.
 *
 * Use `viteMathPlugin()` (below) to run it ahead of vite-plugin-solid. Do
 * not route it through vite-plugin-solid's `babel` option: under Vite 8
 * (Rolldown) that path does not reliably run user plugins before the Solid
 * preset, and `<Math>` compiles to a runtime component call.
 */

const MARKER_MODULE = /(^|\/)math(\.ts)?$/;

function isMarkerImport(source: string): boolean {
    return MARKER_MODULE.test(source);
}

/** Local names bound by imports of the marker module in the current file. */
function markerBindings(program: BabelTypes.Program): Set<string> {
    const names = new Set<string>();
    for (const node of program.body) {
        if (
            node.type !== "ImportDeclaration" ||
            !isMarkerImport(node.source.value)
        ) {
            continue;
        }
        for (const spec of node.specifiers) {
            switch (spec.type) {
                case "ImportDefaultSpecifier":
                case "ImportNamespaceSpecifier":
                case "ImportSpecifier":
                    names.add(spec.local.name);
            }
        }
    }
    return names;
}

export default function mathBabelPlugin({
    types: t,
}: {
    types: typeof BabelTypes;
}): PluginObj {
    let markers: Set<string> = new Set();

    return {
        name: "try-render:math",
        visitor: {
            Program: {
                enter(path) {
                    markers = markerBindings(path.node);
                },
            },

            JSXElement(path) {
                const name = path.node.openingElement.name;
                if (name.type !== "JSXIdentifier" || !markers.has(name.name)) {
                    return;
                }

                const latex = extractLatex(path, t);
                const displayMode = extractDisplayMode(path, t);

                let markup: string;
                try {
                    markup = temml.renderToString(latex, { displayMode });
                } catch (err) {
                    const message =
                        err instanceof Error ? err.message : String(err);
                    throw path.buildCodeFrameError(
                        `<Math> could not compile LaTeX: ${message}\n` +
                            `  latex: ${latex}`,
                    );
                }

                path.replaceWith(
                    t.jsxElement(
                        t.jsxOpeningElement(t.jsxIdentifier("span"), [
                            // Expression container, not a bare attribute: the
                            // MathML contains quotes/unicode that a raw JSX
                            // attribute value cannot hold once re-parsed by
                            // the Solid compiler.
                            t.jsxAttribute(
                                t.jsxIdentifier("innerHTML"),
                                t.jsxExpressionContainer(
                                    t.stringLiteral(markup),
                                ),
                            ),
                        ]),
                        t.jsxClosingElement(t.jsxIdentifier("span")),
                        [],
                        true,
                    ),
                );
            },
        },
    };
}

/** LaTeX children must be fully static: JSX text, or a plain string /
 *  expression-free template literal (use `{String.raw`…`}` when the LaTeX
 *  contains `{`, `}` or `<`). Anything dynamic fails the build. */
function extractLatex(
    path: NodePath<BabelTypes.JSXElement>,
    t: typeof BabelTypes,
): string {
    const meaningful = path.node.children.filter(
        (child) =>
            !(child.type === "JSXText" && child.value.trim() === "") &&
            // JSX comments are empty expression containers.
            !(
                child.type === "JSXExpressionContainer" &&
                child.expression.type === "JSXEmptyExpression"
            ),
    );
    if (meaningful.length !== 1) {
        throw path.buildCodeFrameError(
            "<Math> takes exactly one static child (LaTeX text, " +
                "or a string / String.raw`…` expression). Dynamic children " +
                "cannot be rendered at build time.",
        );
    }

    const child = meaningful[0];
    if (child.type === "JSXText") {
        // Newline + indentation collapses to one space, as JSX rendering would.
        return child.value.trim().replace(/\s*\n\s*/g, " ");
    }
    if (child.type === "JSXExpressionContainer") {
        const expr = child.expression;
        if (t.isStringLiteral(expr)) {
            return expr.value;
        }
        if (t.isTemplateLiteral(expr) && expr.expressions.length === 0) {
            return expr.quasis.map((quasi) => quasi.value.raw).join("");
        }
        if (
            t.isTaggedTemplateExpression(expr) &&
            isStringRaw(expr.tag, t) &&
            expr.quasi.expressions.length === 0
        ) {
            return expr.quasi.quasis.map((quasi) => quasi.value.raw).join("");
        }
    }
    throw path.buildCodeFrameError(
        "<Math> children must be static: JSX text, a string literal, or an " +
            "expression-free template literal such as {String.raw`\\frac{a}{b}`}.",
    );
}

function isStringRaw(
    tag: BabelTypes.Expression,
    t: typeof BabelTypes,
): boolean {
    return (
        t.isMemberExpression(tag) &&
        !tag.computed &&
        t.isIdentifier(tag.object, { name: "String" }) &&
        t.isIdentifier(tag.property, { name: "raw" })
    );
}

/** Only the boolean `display` attribute is supported (display-mode math). */
function extractDisplayMode(
    path: NodePath<BabelTypes.JSXElement>,
    t: typeof BabelTypes,
): boolean {
    let displayMode = false;
    for (const attr of path.node.openingElement.attributes) {
        if (attr.type === "JSXSpreadAttribute") {
            throw path.buildCodeFrameError(
                "<Math> does not support spread attributes.",
            );
        }
        const supported =
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "display" &&
            (attr.value === null ||
                (t.isJSXExpressionContainer(attr.value) &&
                    t.isBooleanLiteral(attr.value.expression, {
                        value: true,
                    })));
        if (!supported) {
            throw path.buildCodeFrameError(
                "<Math> supports only `display` or `display={true}`.",
            );
        }
        displayMode = true;
    }
    return displayMode;
}

/**
 * Vite plugin wrapper: rewrites `<Math>` in .tsx sources before
 * vite-plugin-solid's own `enforce: "pre"` transform compiles the JSX, so
 * Solid never sees a `<Math>` element.
 */
export function viteMathPlugin(): VitePlugin {
    return {
        name: "try-render:math",
        enforce: "pre",
        async transform(code, id) {
            if (!/\.[mc]?tsx?$/i.test(id) || !code.includes("<Math")) {
                return null;
            }
            const result = await transformAsync(code, {
                filename: id,
                sourceMaps: true,
                configFile: false,
                babelrc: false,
                parserOpts: { plugins: ["jsx", "typescript"] },
                plugins: [mathBabelPlugin],
            });
            if (!result?.code) {
                return null;
            }
            return { code: result.code, map: result.map };
        },
    };
}
