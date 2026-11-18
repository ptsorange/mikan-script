import { type Edit, lineStart, indentOf } from "../shared";
import type { Candidate } from "./types";

/** 候補を入れる(複数行のときは今の行のインデントをそろえる。$0 にカーソル) */
export const applyCandidate = (v: string, from: number, caret: number, c: Candidate): Edit => {
  const base = indentOf(v.slice(lineStart(v, from), from));
  let body = c.body;
  // すでに ( があるなら、名前だけ入れる
  if (v[caret] === "(" && /^[^\s(]+\(/.test(body)) body = body.slice(0, body.indexOf("("));
  body = body.replace(/\n/g, "\n" + base);
  const i = body.indexOf("$0");
  const text = i === -1 ? body : body.slice(0, i) + body.slice(i + 2);
  const pos = from + (i === -1 ? text.length : i);
  return { from, to: caret, text, select: [pos, pos] };
};
