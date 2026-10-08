import type { JSX } from "solid-js";

export interface MathProps {
    children: string;
    display?: boolean;
}

/**
 * Marker module for the compile-time `<Math>` element. The Babel plugin
 * (math-plugin.ts, wired into vite-plugin-solid in vite.config.ts) replaces
 * every `<Math>` imported from here with static MathML before Solid's
 * compiler runs — this function never executes in a correctly built app.
 */
export function Math(_props: MathProps): JSX.Element {
    throw new Error(
        "<Math> was not compiled away — is the math plugin active in your vite config?",
    );
}
