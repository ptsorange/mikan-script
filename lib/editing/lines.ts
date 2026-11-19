import { type Edit, INDENT, lineStart, lineEnd, indentOf, isWord } from "./shared";

/* ---------- VS Code と同じ、行の操作 ---------- */

// 選んでいる行(カーソルだけなら、その1行)の範囲。最後の改行は含めない
const selectedLines = (v: string, s: number, e: number) => {
  const from = lineStart(v, s);
  const to = lineEnd(v, e > s && v[e - 1] === "\n" ? e - 1 : e);
  return { from, to };
};

/** Ctrl + C / Ctrl + X で何も選んでいないとき: その行ぜんぶ(改行つき) */
export const wholeLine = (v: string, caret: number) => {
  const from = lineStart(v, caret);
  const end = lineEnd(v, caret);
  return { from, to: Math.min(v.length, end + 1), text: v.slice(from, end) + "\n" };
};

/** Ctrl + Shift + K: 行を消す */
export const deleteLines = (v: string, s: number, e: number): Edit => {
  const { from, to } = selectedLines(v, s, e);
  // うしろに改行があればそれも、なければ前の改行を消す
  if (to < v.length) return { from, to: to + 1, text: "", select: [from, from] };
  const start = Math.max(0, from - 1);
  const caretLine = lineStart(v, start);
  const col = Math.min(s - lineStart(v, s), lineEnd(v, start) - caretLine);
  const pos = from === 0 ? 0 : caretLine + col;
  return { from: start, to, text: "", select: [pos, pos] };
};

/** Alt + ↑ / ↓: 行を上下に動かす */
export const moveLines = (v: string, s: number, e: number, dir: -1 | 1): Edit | null => {
  const { from, to } = selectedLines(v, s, e);
  if (dir === -1) {
    if (from === 0) return null;
    const pFrom = lineStart(v, from - 1);
    const prev = v.slice(pFrom, from - 1);
    const block = v.slice(from, to);
    const d = from - pFrom;
    return { from: pFrom, to, text: block + "\n" + prev, select: [s - d, e - d] };
  }
  if (to >= v.length) return null;
  const nTo = lineEnd(v, to + 1);
  const next = v.slice(to + 1, nTo);
  const block = v.slice(from, to);
  const d = next.length + 1;
  return { from, to: nTo, text: next + "\n" + block, select: [s + d, e + d] };
};

/** Shift + Alt + ↑ / ↓: 行をコピーする(dir は、カーソルが残る側) */
export const copyLines = (v: string, s: number, e: number, dir: -1 | 1): Edit => {
  const { from, to } = selectedLines(v, s, e);
  const block = v.slice(from, to);
  const d = block.length + 1;
  const text = block + "\n" + block;
  // 下にコピー: カーソルはコピーのほうへ。上にコピー: 元の位置のまま
  return { from, to, text, select: dir === 1 ? [s + d, e + d] : [s, e] };
};

/** Ctrl + L: 行を選ぶ(もう一度押すと次の行まで広げる) */
export const selectLine = (v: string, s: number, e: number): Edit => {
  const from = lineStart(v, s);
  const to = Math.min(v.length, lineEnd(v, e > s && v[e - 1] === "\n" ? e - 1 : e) + 1);
  return { from: 0, to: 0, text: "", select: [from, to] };
};

/** Ctrl + Enter 相当: 下 / 上に空行を足す(Ctrl + Shift + Enter は上) */
export const insertLine = (v: string, s: number, above: boolean): Edit => {
  const ls = lineStart(v, s);
  const line = v.slice(ls, lineEnd(v, s));
  const base = indentOf(line);
  const extra = !above && /[{[(]\s*$/.test(line) ? INDENT : "";
  if (above) {
    const text = base + "\n";
    return { from: ls, to: ls, text, select: [ls + base.length, ls + base.length] };
  }
  const at = lineEnd(v, s);
  const text = "\n" + base + extra;
  return { from: at, to: at, text, select: [at + text.length, at + text.length] };
};

/** Home: 行の最初の文字へ。もう一度押すと、行のいちばん左へ */
export const smartHome = (v: string, caret: number): number => {
  const ls = lineStart(v, caret);
  const first = ls + indentOf(v.slice(ls, lineEnd(v, caret))).length;
  return caret === first ? ls : first;
};

/** Ctrl + D 用: カーソルの下にある単語(選んでいなければ) */
export const wordAt = (v: string, caret: number): [number, number] | null => {
  let a = caret;
  let b = caret;
  while (a > 0 && isWord(v[a - 1])) a--;
  while (b < v.length && isWord(v[b])) b++;
  return a === b ? null : [a, b];
};

/** Ctrl + ] / Ctrl + [: 字下げ・字上げ */
export const indentLines = (v: string, s: number, e: number, outdent: boolean): Edit | null => {
  const { from, to } = selectedLines(v, s, e);
  const lines = v.slice(from, to).split("\n");
  let firstDelta = 0;
  let total = 0;
  const out = lines.map((l, i) => {
    let next = l;
    if (!outdent) next = l.length ? INDENT + l : l;
    else {
      const m = /^( {1,2}|\t)/.exec(l);
      if (m) next = l.slice(m[0].length);
    }
    if (i === 0) firstDelta = next.length - l.length;
    total += next.length - l.length;
    return next;
  });
  if (total === 0) return null;
  return { from, to, text: out.join("\n"), select: [Math.max(from, s + firstDelta), Math.max(from, e + total)] };
};
