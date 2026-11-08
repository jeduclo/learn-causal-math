/**
 * Builds one Colab notebook per published day (public/notebooks/dXX.ipynb) from content/days/dXX.md.
 * Text becomes Markdown cells, every ```python block becomes a code cell, and each
 * exercise's solution is kept in a collapsible <details> block so students can try first.
 * Runs automatically before `npm run build`; run it alone with `npm run notebooks`.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const SRC = path.join(process.cwd(), "content", "days");
const OUT = path.join(process.cwd(), "public", "notebooks");
fs.mkdirSync(OUT, { recursive: true });

/** Site Markdown uses $$…$$ for all maths; Jupyter wants $…$ inline and literal dollars escaped. */
function toJupyterMath(md: string): string {
  const parts = md.split(/(\$\$[\s\S]*?\$\$)/g);
  return parts
    .map((p, i) => {
      if (i % 2 === 0) return p.replace(/\$/g, "\\$");
      const inner = p.slice(2, -2);
      const display = /\n/.test(inner);
      return display ? `$$${inner}$$` : `$${inner.trim()}$`;
    })
    .join("");
}

const md = (src: string) => ({ cell_type: "markdown", metadata: {}, source: toJupyterMath(src.trim()).split(/(?<=\n)/) });
const code = (src: string) => ({ cell_type: "code", metadata: {}, execution_count: null, outputs: [], source: src.trim().split(/(?<=\n)/) });

for (const file of fs.readdirSync(SRC).filter((f) => /^d\d+\.md$/.test(f))) {
  const { data, content } = matter(fs.readFileSync(path.join(SRC, file), "utf8"));
  const cells: object[] = [
    md(`# Day ${data.day}: ${data.title}\n\n*Beginner to Ninja: Math for Causal Inference*\n\n${data.summary}\n\n**Learning outcomes**\n\n${(data.outcomes as string[]).map((o) => `- ${o}`).join("\n")}`),
  ];
  const chunks = content.split(/^```python\n([\s\S]*?)^```\s*$/m);
  chunks.forEach((chunk, i) => {
    if (i % 2 === 1) return void cells.push(code(chunk));
    // split prose at each exercise so every exercise is its own cell, followed by an empty answer cell
    const pieces = chunk.split(/^(?=### Exercise )/m).filter((s) => s.trim());
    for (const piece of pieces) {
      cells.push(md(piece));
      if (piece.startsWith("### Exercise")) cells.push(md("*Your work:*\n\n"));
    }
  });
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: { kernelspec: { name: "python3", display_name: "Python 3" }, language_info: { name: "python" }, colab: { provenance: [] } },
    cells,
  };
  fs.writeFileSync(path.join(OUT, file.replace(".md", ".ipynb")), JSON.stringify(nb, null, 1));
}
console.log("notebooks written to public/notebooks");
