/* ---------- エディタの入力補助で、みんなが使う道具 ---------- */

// 文字の置きかえ。from〜to を text に置きかえて、そのあと select の範囲を選ぶ
export type Edit = {
  from: number;
  to: number;
  text: string;
  select: [number, number];
};

export const INDENT = "  ";
export const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
export const CLOSERS = new Set([")", "]", "}"]);
export const QUOTES = new Set(['"', "'", "`"]);
const WORD = /[\p{L}\p{N}_$]/u;
export const isWord = (c: string | undefined) => !!c && WORD.test(c);

export const lineStart = (v: string, i: number) => v.lastIndexOf("\n", i - 1) + 1;
export const lineEnd = (v: string, i: number) => {
  const n = v.indexOf("\n", i);
  return n === -1 ? v.length : n;
};
export const indentOf = (line: string) => /^[ \t]*/.exec(line)![0];

/** 行の先頭からカーソルまでを見て、文字列・コメントの中かどうか調べる */
export const lineState = (before: string): { quote: string | null; comment: boolean } => {
  let quote: string | null = null;
  for (let i = 0; i < before.length; i++) {
    const c = before[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
    } else if (QUOTES.has(c)) quote = c;
    else if (c === "/" && before[i + 1] === "/") return { quote: null, comment: true };
  }
  return { quote, comment: false };
};
