import { INDENT, PAIRS, CLOSERS, QUOTES, indentOf } from "./shared";

/* ---------- 整形(フォーマット) ---------- */

// 1行の中の、文字列・コメントの外にあるかっこの数を数える
const scanLine = (line: string) => {
  let quote: string | null = null;
  let net = 0;
  let leading = 0;
  let seenOther = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (QUOTES.has(c)) {
      quote = c;
      seenOther = true;
    } else if (c === "/" && line[i + 1] === "/") break;
    else if (c in PAIRS) {
      net++;
      seenOther = true;
    } else if (CLOSERS.has(c)) {
      net--;
      if (!seenOther) leading++;
    } else if (!/\s/.test(c)) seenOther = true;
  }
  return { net, leading };
};

/** インデントをそろえ、行末の空白と余分な空行を整える */
export const formatCode = (code: string, caret: number): { text: string; caret: number } => {
  const lines = code.replace(/\r\n?/g, "\n").split("\n");
  // カーソルが何行目の何文字目か
  const head = code.slice(0, caret).replace(/\r\n?/g, "\n").split("\n");
  const caretLine = head.length - 1;
  const caretCol = head[head.length - 1].length;

  const out: string[] = [];
  const outIndexOf: number[] = []; // 元の行 → 整形後の行
  let depth = 0;
  let blank = 0;

  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (trimmed) {
      const { net, leading } = scanLine(trimmed);
      out.push(INDENT.repeat(Math.max(0, depth - leading)) + trimmed);
      depth = Math.max(0, depth + net);
      blank = 0;
    } else if (++blank <= 1 && out.length > 0) {
      out.push("");
    }
    outIndexOf[i] = Math.max(0, out.length - 1);
  });

  // 最後の空行はけずって、改行1つで終わる
  while (out.length && out[out.length - 1] === "") out.pop();
  const text = out.length ? out.join("\n") + "\n" : "";

  const oi = Math.min(outIndexOf[caretLine] ?? 0, Math.max(0, out.length - 1));
  const oldIndent = indentOf(lines[caretLine] ?? "").length;
  const newLine = out[oi] ?? "";
  const col = lines[caretLine]?.trim()
    ? Math.min(newLine.length, indentOf(newLine).length + Math.max(0, caretCol - oldIndent))
    : 0;
  let pos = 0;
  for (let i = 0; i < oi; i++) pos += out[i].length + 1;
  return { text, caret: Math.min(pos + col, text.length) };
};
