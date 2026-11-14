import { commands } from "./lang";

/* ---------- エディタの入力補助(かっこ・インデント・整形・候補) ---------- */

// 文字の置きかえ。from〜to を text に置きかえて、そのあと select の範囲を選ぶ
export type Edit = {
  from: number;
  to: number;
  text: string;
  select: [number, number];
};

const INDENT = "  ";
const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = new Set([")", "]", "}"]);
const QUOTES = new Set(['"', "'", "`"]);
const WORD = /[\p{L}\p{N}_$]/u;
const isWord = (c: string | undefined) => !!c && WORD.test(c);

const lineStart = (v: string, i: number) => v.lastIndexOf("\n", i - 1) + 1;
const lineEnd = (v: string, i: number) => {
  const n = v.indexOf("\n", i);
  return n === -1 ? v.length : n;
};
const indentOf = (line: string) => /^[ \t]*/.exec(line)![0];

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

/* ---------- 入力候補 ---------- */

export type Candidate = {
  label: string; // 表示する名前(これを入力する)
  detail: string; // 右がわの説明
  kind: "kw" | "fn" | "var" | "member" | "file";
  body: string; // 入れる文章。$0 の位置にカーソルが来る
};

export type Completion = { from: number; items: Candidate[]; typed: string };

const SNIPPETS: Record<string, string> = {
  if: "if ($0) {\n  \n}",
  else: "else {\n  $0\n}",
  while: "while ($0) {\n  \n}",
  for: "for (i, $0) {\n  \n}",
  foreach: "foreach (e, $0) {\n  \n}",
  function: "function $0() {\n  \n}",
  onStart: "onStart {\n  $0\n}",
  onKeyDown: "onKeyDown(e) {\n  $0\n}",
  onKeyUp: "onKeyUp(e) {\n  $0\n}",
  sleep: "sleep($0)",
  print: "print($0)",
  println: "println($0)",
  clearLog: "clearLog()",
  setScreenSize: "setScreenSize($0)",
  random: "random($0)",
  collide: "collide($0)",
  isKey: 'isKey("$0")',
  getNowKey: "getNowKey()",
  playSound: 'playSound("$0")',
  stopSound: 'stopSound("$0")',
  text: 'text $0 = ""',
  num: "num $0 = 0",
  sprite: "sprite $0 = ",
  await: "await ",
};

// setEffect("…") などの 1 つ目の引数で出す、効果の名前。jp は日本語でも書ける名前
const EFFECTS: { name: string; jp: string; detail: string }[] = [
  { name: "color", jp: "色", detail: "色相をずらす(200 でひとまわり)" },
  { name: "fisheye", jp: "魚眼レンズ", detail: "中心をふくらませる" },
  { name: "whirl", jp: "渦巻き", detail: "中心をねじる(角度)" },
  { name: "pixelate", jp: "ピクセル化", detail: "粗いブロックにする" },
  { name: "mosaic", jp: "モザイク", detail: "小さな絵をタイルのように並べる" },
  { name: "brightness", jp: "明るさ", detail: "明るく/暗く(-100〜100)" },
  { name: "ghost", jp: "幽霊", detail: "透明にする(0〜100)" },
];
const EFFECT_CALL = /\.\s*(?:setEffect|changeEffect|getEffect)\s*\(\s*["'`][^"'`]*$/;

const FUNCS: { name: string; sig: string; body: string }[] = [
  { name: "makeSprite", sig: "(画像, x, y, w, h)", body: 'makeSprite("$0", 0, 0, 64, 64)' },
  { name: "makeShapeSprite", sig: "(x, y, w, h, 色)", body: "makeShapeSprite($0)" },
  { name: "makeTextSprite", sig: "(文字, x, y, サイズ, 色)", body: "makeTextSprite($0)" },
  { name: "draw", sig: "()", body: "draw()" },
];

const SPRITE_MEMBERS: [string, string][] = [
  ["x", "左上のx座標"],
  ["y", "左上のy座標"],
  ["w", "はば"],
  ["h", "高さ"],
  ["r", "回転(度)"],
  ["size", "大きさ・文字サイズ"],
  ["color", "色"],
  ["text", "文字"],
  ["tags", "タグの配列"],
  ["middle", "中心を基準にする"],
  ["move(", "向きへ進む"],
  ["lookAt(", "相手の方を向く"],
  ["addTag(", "タグをつける"],
  ["removeTag(", "タグをはずす"],
  ["hasTag(", "タグがあるか"],
  ["isHovering(", "マウスが上にあるか"],
  ["isClicking(", "クリックしているか"],
  ["flip", "スプライトを反転"],
  ["dontFlip", "反転を禁止する"],
  ["changeTexture(", "テクスチャを変更する"],
  ["layer", "層(大きいほど手前)"],
  ["setLayer(", "層を決める"],
  ["toFront(", "いちばん手前に出す"],
  ["toBack(", "いちばん奥に下げる"],
  ["setEffect(", '効果をつける("color" など, 値)'],
  ["changeEffect(", "効果を増減する"],
  ["getEffect(", "効果の値を調べる"],
  ["clearEffects(", "効果をぜんぶ消す"],
];
const GROUP_MEMBERS: [string, string][] = [
  ["add(", "追加する"],
  ["remove(", "取りのぞく"],
  ["withTag(", "タグで絞る"],
  ["hit(", "ぶつかった要素"],
  ["clear(", "ぜんぶ消す"],
  ["draw(", "ぜんぶ描く"],
  ["layer", "グループの層"],
  ["length", "個数"],
  ["push(", "うしろに追加"],
  ["filter(", "絞りこむ"],
];
const MOUSE_MEMBERS: [string, string][] = [
  ["x", "マウスのx"],
  ["y", "マウスのy"],
  ["left", "左ボタン"],
  ["middle", "まん中ボタン"],
  ["right", "右ボタン"],
];

const ID = "[\\p{L}_$][\\p{L}\\p{N}_$]*";

/** コードの中で宣言された名前を集める */
const scanNames = (code: string) => {
  const vars = new Set<string>();
  const sprites = new Set<string>();
  const groups = new Set<string>();
  const decl = new RegExp(
    `(?:^|[\\s;{}])(sprite|スプライト|num|数|text|テキスト|let|const|var|function|関数)\\s+(${ID})(\\s*\\[\\s*\\]|\\s*=\\s*\\[\\s*\\])?`,
    "gu"
  );
  for (const m of code.matchAll(decl)) {
    vars.add(m[2]);
    if (m[1] === "sprite" || m[1] === "スプライト") {
      sprites.add(m[2]);
      if (m[3]) groups.add(m[2]);
    }
  }
  const loops = new RegExp(`(?:for|foreach|繰り返す|それぞれ)\\s*\\(\\s*(${ID})\\s*,`, "gu");
  for (const m of code.matchAll(loops)) vars.add(m[1]);
  const params = new RegExp(`(?:function|関数|onKeyDown|onKeyUp|キーを押したら|キーを離したら)\\s*(?:${ID})?\\s*\\(([^)\\n]*)\\)`, "gu");
  for (const m of code.matchAll(params)) {
    m[1].split(",").forEach((p) => {
      const n = p.trim();
      if (new RegExp(`^${ID}$`, "u").test(n)) vars.add(n);
    });
  }
  return { vars, sprites, groups };
};

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
  force = false
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

    const items = assets
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
    if (obj === "mouse" || obj === "マウス") list = MOUSE_MEMBERS;
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
