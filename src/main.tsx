/* Client entry for `pnpm dev` and the SPA build. Math is already static
 * markup by the time this runs — no renderer is loaded here. */
import { render } from "solid-js/web";
import App from "./App";

const root = document.getElementById("root");
if (!root) {
    throw new Error("index.html is missing its #root element");
}

render(() => <App />, root);
