import { type Edit, INDENT, PAIRS, CLOSERS, QUOTES, isWord, lineStart, lineEnd, indentOf, lineState } from "./shared";

/* ---------- かっこ・クォートを自動で閉じる ---------- */

export const typeChar = (v: string, s: number, e: number, ch: string): Edit | null => {
  const next = v[e];
  const prev = v[s - 1];

  // 閉じかっこ・クォートは、すでにあるなら上書きせず飛びこえる
  if (s === e && (CLOSERS.has(ch) || QUOTES.has(ch)) && next === ch) {
    return { from: s, to: s, text: "", select: [s + 1, s + 1] };
  }

  // } を行の先頭で打ったら、インデントを1段戻す
  if (s === e && ch === "}") {
    const before = v.slice(lineStart(v, s), s);
    if (/^ +$/.test(before) && before.length >= INDENT.length) {
      const from = s - INDENT.length;
      return { from, to: s, text: "}", select: [from + 1, from + 1] };
    }
    return null;
  }

  if (ch in PAIRS) {
    const close = PAIRS[ch];
    if (s !== e) {
      // 選んでいる部分をかっこで囲む
      return { from: s, to: e, text: ch + v.slice(s, e) + close, select: [s + 1, e + 1] };
    }
    const st = lineState(v.slice(lineStart(v, s), s));
    if (st.quote || st.comment) return null;
    if (next === undefined || /[\s)\]};,]/.test(next)) {
      return { from: s, to: s, text: ch + close, select: [s + 1, s + 1] };
    }
    return null;
  }

  if (QUOTES.has(ch)) {
    if (s !== e) {
      return { from: s, to: e, text: ch + v.slice(s, e) + ch, select: [s + 1, e + 1] };
    }
    const st = lineState(v.slice(lineStart(v, s), s));
    if (st.quote || st.comment) return null; // 文字列の中・コメントの中(don't など)
    if (isWord(prev)) return null; // 英単語の直後は閉じない
    if (next === undefined || /[\s)\]};,]/.test(next)) {
      return { from: s, to: s, text: ch + ch, select: [s + 1, s + 1] };
    }
  }
  return null;
};

/** Backspace: 空の () や "" の中なら、両方まとめて消す */
export const backspace = (v: string, s: number, e: number): Edit | null => {
  if (s !== e || s === 0) return null;
  const a = v[s - 1];
  const b = v[s];
  if ((a in PAIRS && PAIRS[a] === b) || (QUOTES.has(a) && a === b)) {
    return { from: s - 1, to: s + 1, text: "", select: [s - 1, s - 1] };
  }
  return null;
};

/* ---------- Enter: インデントを引きつぐ ---------- */

export const enter = (v: string, s: number, e: number): Edit => {
  const ls = lineStart(v, s);
  const before = v.slice(ls, s);
  const base = indentOf(before);
  const prev = v[s - 1];
  const next = v[e];
  const st = lineState(before);
  const opens = !st.comment && !st.quote && prev !== undefined && prev in PAIRS;

  if (opens && next === PAIRS[prev]) {
    const mid = "\n" + base + INDENT;
    const text = mid + "\n" + base;
    return { from: s, to: e, text, select: [s + mid.length, s + mid.length] };
  }
  const extra = !st.comment && /[{[(]\s*$/.test(before) ? INDENT : "";
  const text = "\n" + base + extra;
  return { from: s, to: e, text, select: [s + text.length, s + text.length] };
};

/* ---------- Tab / Shift+Tab ---------- */

export const tab = (v: string, s: number, e: number, shift: boolean): Edit | null => {
  const multi = v.slice(s, e).includes("\n");
  if (!shift && !multi) {
    return { from: s, to: e, text: INDENT, select: [s + 2, s + 2] };
  }
  // 行ごとに字下げ・字上げ
  const from = lineStart(v, s);
  const to = lineEnd(v, e > s && v[e - 1] === "\n" ? e - 1 : e);
  const lines = v.slice(from, to).split("\n");
  let firstDelta = 0;
  let total = 0;
  const out = lines.map((l, i) => {
    let next = l;
    if (!shift) next = l.length ? INDENT + l : l;
    else {
      const m = /^( {1,2}|\t)/.exec(l);
      if (m) next = l.slice(m[0].length);
    }
    const d = next.length - l.length;
    if (i === 0) firstDelta = d;
    total += d;
    return next;
  });
  if (total === 0) return null;
  const text = out.join("\n");
  const newS = Math.max(from, s + firstDelta);
  return { from, to, text, select: [newS, e + total] };
};

/* ---------- Ctrl + / コメントのON/OFF ---------- */

export const toggleComment = (v: string, s: number, e: number): Edit => {
  const from = lineStart(v, s);
  const to = lineEnd(v, e > s && v[e - 1] === "\n" ? e - 1 : e);
  const lines = v.slice(from, to).split("\n");
  const targets = lines.filter((l) => l.trim());
  const allCommented = targets.length > 0 && targets.every((l) => /^\s*\/\//.test(l));
  const minIndent = Math.min(...targets.map((l) => indentOf(l).length), Infinity);
  let firstDelta = 0;
  let total = 0;
  const out = lines.map((l, i) => {
    let next = l;
    if (l.trim()) {
      if (allCommented) next = l.replace(/^(\s*)\/\/ ?/, "$1");
      else next = l.slice(0, minIndent) + "// " + l.slice(minIndent);
    }
    if (i === 0) firstDelta = next.length - l.length;
    total += next.length - l.length;
    return next;
  });
  return {
    from,
    to,
    text: out.join("\n"),
    select: [Math.max(from, s + firstDelta), Math.max(from, e + total)],
  };
};
