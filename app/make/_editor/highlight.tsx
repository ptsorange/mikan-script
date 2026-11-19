import type { ReactNode } from "react";
import { commands } from "@/lib/lang";

/* ---------- コードの色分け ---------- */

// みかんスクリプト独自のキーワード(ブロックの色)
const WORD_CLASS: Record<string, string> = {};
const group = (cls: string, names: string[]) =>
  names.forEach((n) => {
    WORD_CLASS[n] = cls;
    const c = commands.find((c) => c.en === n);
    if (c) WORD_CLASS[c.jp] = cls;
  });
group("ev", ["onStart", "onKeyDown", "onKeyUp"]); // イベント(黄)
group("ct", ["if", "else", "while", "for", "foreach", "times", "sleep", "await", "import", "function"]); // せいぎょ(橙)
group("lk", ["print", "println", "clearLog"]); // 見た目(紫)
group("vr", ["text", "num", "sprite"]); // へんすう・スプライト(ピンク)
group("mt", [
  "setScreenSize",
  "makeSprite",
  "makeShapeSprite",
  "makeTextSprite",
  "playSound",
  "stopSound",
  "random",
  "collide",
  "isKey",
  "getNowKey",
]); // 関数(水色)
group("pn", ["penColor", "penSize", "penDot", "penLine", "penRect", "penCircle", "penClear"]); // ペン(緑)
group("bi", ["mouse", "PI"]); // 組みこみの値

// JavaScript の予約語(みかんスクリプトの色がついていないもの)
const JS_KEYWORDS = new Set([
  "const", "let", "var", "return", "break", "continue", "switch", "case", "default",
  "do", "in", "of", "try", "catch", "finally", "throw", "new", "typeof", "instanceof",
  "delete", "void", "class", "extends", "super", "async", "yield", "static", "get", "set",
]);
// true / false など、値として使うことば
const JS_VALUES = new Set(["true", "false", "null", "undefined", "this", "NaN", "Infinity"]);
// よく使う標準オブジェクト
const JS_GLOBALS = new Set([
  "Math", "JSON", "Object", "Array", "Number", "String", "Boolean", "Date", "Promise", "Map", "Set",
  "RegExp", "Error", "Symbol", "console", "window", "document", "parseInt", "parseFloat", "isNaN",
  "setTimeout", "setInterval", "clearTimeout", "clearInterval", "requestAnimationFrame",
]);

// 1: // コメント  2: /* */ コメント  3: 文字列  4: テンプレート文字列  5: 数  6: 単語
const HL_RE =
  /(\/\/[^\n]*)|(\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(`(?:\\[\s\S]|[^`\\])*`?)|(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([^\s.,:?!%()=<>+\-*\/|&\[\]{}"'`;]+)/g;

const classOf = (code: string, m: RegExpMatchArray, i: number): string | undefined => {
  if (m[1] || m[2]) return "cm";
  if (m[3] || m[4]) return "st";
  if (m[5]) return "nu";
  const w = m[6];
  const afterDot = code[i - 1] === "." && code[i - 2] !== "."; // 「.」のあとはプロパティ名
  if (afterDot) return /^\s*\(/.test(code.slice(i + w.length, i + w.length + 40)) ? "fc" : "pr";
  if (WORD_CLASS[w]) return WORD_CLASS[w];
  if (JS_KEYWORDS.has(w)) return "kw";
  if (JS_VALUES.has(w)) return "va";
  if (JS_GLOBALS.has(w)) return "gl";
  if (/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(w) && code[i + w.length] === "(") return "fc"; // 関数の呼び出し
  return undefined;
};

export const highlight = (code: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(HL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const cls = classOf(code, m, i);
    out.push(
      cls ? (
        <span key={i} className={`tk-${cls}`}>
          {m[0]}
        </span>
      ) : (
        m[0]
      )
    );
    last = i + m[0].length;
  }
  out.push(code.slice(last) + "\n"); // 最後の改行も高さにふくめる
  return out;
};
