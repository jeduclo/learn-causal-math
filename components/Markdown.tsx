import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import { slugify } from "@/lib/content";

type HastNode = { type: string; value?: string; children?: HastNode[] };
const textOf = (n?: HastNode): string =>
  !n ? "" : n.type === "text" ? n.value ?? "" : (n.children ?? []).map(textOf).join("");

/** Wrap every "### Exercise …" block (heading + solution) in a card. */
function wrapExercises(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let open = false;
  for (const line of lines) {
    const isEx = line.startsWith("### Exercise");
    const isBoundary = line.startsWith("## ") || (line.startsWith("### ") && !isEx);
    if ((isEx || isBoundary) && open) {
      out.push("", "</div>", "");
      open = false;
    }
    if (isEx) {
      out.push("", '<div class="exercise">', "");
      open = true;
    }
    out.push(line);
  }
  if (open) out.push("", "</div>", "");
  return out.join("\n");
}

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
        components={{
          h2: ({ node, children }) => <h2 id={slugify(textOf(node as HastNode))}>{children}</h2>,
          h3: ({ node, children }) => <h3 id={slugify(textOf(node as HastNode))}>{children}</h3>,
        }}
      >
        {wrapExercises(source)}
      </ReactMarkdown>
    </div>
  );
}
