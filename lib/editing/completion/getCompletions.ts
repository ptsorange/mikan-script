import { commands } from "../../lang";
import { isWord, lineStart, lineState } from "../shared";
import { SNIPPETS, EFFECTS, EFFECT_CALL, FUNCS, SPRITE_MEMBERS, GROUP_MEMBERS, MOUSE_MEMBERS } from "./data";
import { IMPORT_PATH_TYPING, scanImports, scanExports, scanNames } from "./scan";
import type { Candidate, Completion } from "./types";

const KEYWORD_ITEMS = (() => {
  const items: { en: string; jp?: string; body: string; detail: string }[] = [];
  const names = new Set<string>();
  for (const c of commands) {
    names.add(c.en);
    items.push({ en: c.en, jp: c.jp, body: SNIPPETS[c.en] ?? c.en, detail: c.jp });
  }
  return { items, names };
})();

const rank = (word: string, q: string) => {
  const w = word.toLowerCase();
  if (w === q) return 0;
  if (w.startsWith(q)) return 1;
  if (w.includes(q)) return 2;
  return 99;
};

/** カーソル位置で出す候補を作る。出すものがなければ null */
export const getCompletions = (
  v: string,
  caret: number,
  assets: string[],
  force = false,
  modules?: (path: string) => string | undefined // コードファイルの中身(「名前.」のあとの候補用)
): Completion | null => {
  const ls = lineStart(v, caret);
  const before = v.slice(ls, caret);
  const st = lineState(before);
  if (st.comment) return null;

  // 文字列の中: 画像・音のファイル名
  if (st.quote) {
    const qi = before.lastIndexOf(st.quote);
    const typed = before.slice(qi + 1);

    // setEffect("…") の中: 効果の名前(日本語で打っているときは日本語のまま入れる)
    if (EFFECT_CALL.test(before)) {
      const q = typed.toLowerCase();
      const effectItems = EFFECTS
        .map((e) => {
          const useJp = rank(e.jp, q) < rank(e.name, q);
          return { e, useJp, r: Math.min(rank(e.name, q), rank(e.jp, q)) };
        })
        .filter((x) => x.r < 99)
        .sort((a, b) => a.r - b.r)
        .map<Candidate>(({ e, useJp }) => ({
          label: useJp ? e.jp : e.name,
          detail: (useJp ? e.name + ": " : e.jp + ": ") + e.detail,
          kind: "member",
          body: useJp ? e.jp : e.name,
        }));
      if (!effectItems.length || (effectItems.length === 1 && effectItems[0].label === typed)) return null;
      return { from: ls + qi + 1, items: effectItems, typed };
    }

    // import 名前 "…" の中: コードファイルのパス
    if (IMPORT_PATH_TYPING.test(before)) {
      const q = typed.toLowerCase().replace(/^\.?\//, "").replace(/^code\//, "");
      const codeItems = assets
        .filter((a) => a.startsWith("code/"))
        .map((a) => ({ a, r: rank(a.slice("code/".length), q) }))
        .filter((x) => x.r < 99)
        .sort((x, y) => x.r - y.r || x.a.localeCompare(y.a))
        .slice(0, 8)
        .map<Candidate>(({ a }) => ({ label: "/" + a, detail: "コード", kind: "file", body: "/" + a }));
      if (!codeItems.length || (codeItems.length === 1 && codeItems[0].label === typed)) return null;
      return { from: ls + qi + 1, items: codeItems, typed };
    }

    const items = assets
      .filter((a) => !a.startsWith("code/")) // コードファイルは import のパスにだけ出す
      .map((a) => ({ a, r: rank(a, typed.toLowerCase()) }))
      .filter((x) => x.r < 99)
      .sort((x, y) => x.r - y.r || x.a.localeCompare(y.a))
      .slice(0, 8)
      .map<Candidate>(({ a }) => ({
        label: a,
        detail: a.startsWith("sound/") ? "音" : "画像",
        kind: "file",
        body: a,
      }));
    if (!items.length || (items.length === 1 && items[0].label === typed)) return null;
    if (!force && !/(makeSprite|playSound|stopSound)\s*\(\s*["'`][^"'`]*$/.test(before)) return null;
    return { from: ls + qi + 1, items, typed };
  }

  // . のあと: プロパティ・メソッド
  const dot = /([\p{L}\p{N}_$]+)\.([\p{L}\p{N}_$]*)$/u.exec(before);
  if (dot && !/^\d+$/.test(dot[1])) {
    const names = scanNames(v);
    const obj = dot[1];
    const typed = dot[2];
    let list: [string, string][];
    const importedPath = scanImports(v).get(obj);
    if (importedPath) list = scanExports(modules?.(importedPath) ?? "");
    else if (obj === "mouse" || obj === "マウス") list = MOUSE_MEMBERS;
    else if (names.groups.has(obj)) list = GROUP_MEMBERS;
    else if (names.sprites.has(obj)) list = SPRITE_MEMBERS;
    else list = [...SPRITE_MEMBERS, ...GROUP_MEMBERS];
    const q = typed.toLowerCase();
    const items = list
      .map(([n, d]) => ({ n, d, r: q ? rank(n.replace("(", ""), q) : 1 }))
      .filter((x) => x.r < 99)
      .sort((a, b) => a.r - b.r)
      .slice(0, 20)
      .map<Candidate>(({ n, d }) => ({
        label: n.replace("(", ""),
        detail: d,
        kind: "member",
        body: n.endsWith("(") ? n.replace("(", "($0)") : n,
      }));
    if (!items.length || (items.length === 1 && items[0].label === typed && !items[0].body.includes("$0")))
      return null;
    return { from: caret - typed.length, items, typed };
  }

  // ふつうの単語
  let i = before.length;
  while (i > 0 && isWord(before[i - 1])) i--;
  const typed = before.slice(i);
  if (!typed && !force) return null;
  if (/^\d/.test(typed)) return null;
  const from = caret - typed.length;
  const q = typed.toLowerCase();

  const names = scanNames(v.slice(0, from) + v.slice(caret));
  const scored: { c: Candidate; r: number }[] = [];
  const push = (c: Candidate, ...keys: string[]) => {
    const r = q ? Math.min(...keys.map((k) => rank(k, q))) : 1;
    if (r < 99) scored.push({ c, r });
  };

  for (const k of KEYWORD_ITEMS.items) {
    const jpMatch = k.jp !== undefined && rank(k.jp, q) < rank(k.en, q);
    if (jpMatch) {
      // 日本語で打っているときは日本語のまま入れる
      const body = SNIPPETS[k.en] ? SNIPPETS[k.en].replace(new RegExp(`^${k.en}(?![\\p{L}\\p{N}_$])`, "u"), k.jp!) : k.jp!;
      push({ label: k.jp!, detail: k.en, kind: "kw", body }, k.jp!);
    } else {
      push({ label: k.en, detail: k.jp ?? "", kind: /^[a-z]+$/.test(k.en) && SNIPPETS[k.en]?.includes("(") && !SNIPPETS[k.en].includes("{") ? "fn" : "kw", body: k.body }, k.en);
    }
  }
  for (const f of FUNCS) push({ label: f.name, detail: f.sig, kind: "fn", body: f.body }, f.name);
  for (const n of names.vars) {
    if (KEYWORD_ITEMS.names.has(n)) continue;
    push({ label: n, detail: names.sprites.has(n) ? "スプライト" : "なまえ", kind: "var", body: n }, n);
  }
  push({ label: "mouse", detail: "マウス", kind: "kw", body: "mouse" }, "mouse", "マウス");

  const seen = new Set<string>();
  const items = scored
    .sort((a, b) => a.r - b.r || (a.c.kind === "var" ? -1 : 0) - (b.c.kind === "var" ? -1 : 0))
    .map((x) => x.c)
    .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)))
    .slice(0, 8);
  if (!items.length) return null;
  if (!force && items.length === 1 && items[0].label === typed && !items[0].body.includes("$0")) return null;
  return { from, items, typed };
};
