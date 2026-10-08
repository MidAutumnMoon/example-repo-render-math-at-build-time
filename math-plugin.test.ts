import { transformAsync } from "@babel/core";
import { describe, expect, it } from "vitest";
import mathPlugin from "./math-plugin.ts";

async function compile(code: string): Promise<string> {
    const result = await transformAsync(code, {
        filename: "test.tsx",
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [mathPlugin],
    });
    if (!result?.code) {
        throw new Error("transform produced no output");
    }
    return result.code;
}

const MARKER = 'import { Math } from "./math";';

describe("math-plugin", () => {
    it("inlines JSX text children as MathML", async () => {
        const out = await compile(`${MARKER}\nconst el = <Math>E=mc^2</Math>;`);
        expect(out).toContain("innerHTML");
        expect(out).toContain("<math");
        expect(out).toContain("<mi>E</mi>");
        expect(out).not.toContain("<Math");
    });

    it("keeps the LaTeX source out of the output", async () => {
        const out = await compile(
            `${MARKER}\nconst el = <Math>{String.raw\`\\frac{a}{b}\`}</Math>;`,
        );
        expect(out).toContain("<mfrac");
        expect(out).not.toContain("\\frac");
    });

    it("honors display mode", async () => {
        const out = await compile(
            `${MARKER}\nconst el = <Math display>a</Math>;`,
        );
        expect(out).toContain("tml-display");
        expect(out).toContain("display=");
    });

    it("rejects dynamic children", async () => {
        await expect(
            compile(`${MARKER}\nconst el = <Math>{expr}</Math>;`),
        ).rejects.toThrow(/static/);
    });

    it("rejects multiple children", async () => {
        await expect(
            compile(`${MARKER}\nconst el = <Math>a{b}c</Math>;`),
        ).rejects.toThrow(/exactly one/);
    });

    it("reports LaTeX errors as build errors", async () => {
        await expect(
            compile(`${MARKER}\nconst el = <Math>\\frac{a}</Math>;`),
        ).rejects.toThrow(/Math/);
    });

    it("ignores <Math> imported from another module", async () => {
        const out = await compile(
            'import { Math } from "./other";\nconst el = <Math>y</Math>;',
        );
        expect(out).toContain("<Math>");
    });

    it("tolerates JSX comments around the LaTeX", async () => {
        const out = await compile(
            `${MARKER}\nconst el = <Math>{/* note */}E=mc^2{/* end */}</Math>;`,
        );
        expect(out).toContain("<mi>E</mi>");
    });

    it("rejects unsupported attributes", async () => {
        await expect(
            compile(`${MARKER}\nconst el = <Math color="red">y</Math>;`),
        ).rejects.toThrow(/supports only `display`/);
    });
});
