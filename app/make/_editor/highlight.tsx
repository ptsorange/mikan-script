import type { ReactNode } from "react";
import { commands } from "@/lib/lang";

/* ---------- コードの色分け ---------- */

const WORD_CLASS: Record<string, string> = {};
const group = (cls: string, names: string[]) =>
  names.forEach((n) => {
    WORD_CLASS[n] = cls;
    const c = commands.find((c) => c.en === n);
    if (c) WORD_CLASS[c.jp] = cls;
  });
group("ev", ["onStart", "onKeyDown", "onKeyUp"]); // イベント(黄)
group("ct", ["if", "else", "while", "for", "times", "sleep", "await"]); // せいぎょ(橙)
group("lk", ["print", "println", "clearLog"]); // 見た目(紫)
group("vr", ["text", "num", "sprite"]); // へんすう・スプライト(ピンク)
group("mt", ["setScreenSize", "makeSprite", "playSound", "stopSound"]); // 関数(水色)

const HL_RE =
  /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\d+(?:\.\d+)?)|([^\s.,:?!%()=<>+\-*\/|&\[\]{}"';]+)/g;

export const highlight = (code: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(HL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const cls = m[1] ? "cm" : m[2] ? "st" : m[3] ? "nu" : WORD_CLASS[m[4]];
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
