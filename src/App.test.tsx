import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
    it("renders math as static MathML markup", () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        render(() => <App />, host);

        expect(host.innerHTML).toContain("<math");
        expect(host.querySelectorAll("math").length).toBeGreaterThanOrEqual(4);
        expect(host.innerHTML).not.toContain("<Math");
        expect(host.innerHTML).not.toContain("renderToString");
    });
});
