import type { JSX } from "solid-js";
import { Math } from "./math";

function Title(props: { children: JSX.Element }): JSX.Element {
    return <h1>{props.children}</h1>;
}

function Post(props: { children: JSX.Element }): JSX.Element {
    return <article class="post">{props.children}</article>;
}

export default function App(): JSX.Element {
    return (
        <Post>
            <Title>My post about math</Title>
            <p>
                Einstein told us that <Math>E = mc^2</Math>, and the difference
                of two squares factors as:
            </p>
            <Math display>a^2 - b^2 = (a+b)(a-b)</Math>
            <p>
                LaTeX containing braces belongs in a template literal, like{" "}
                <Math>{String.raw`\frac{a}{b}`}</Math> or{" "}
                <Math>{String.raw`\sqrt[3]{x^2 + 1}`}</Math>. Display mode works
                too:
            </p>
            <Math
                display
            >{String.raw`\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}`}</Math>
        </Post>
    );
}
