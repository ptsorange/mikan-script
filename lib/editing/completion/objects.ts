/* ---------- オブジェクトの中身を、コードから読みとる ----------
   const cubeSetting = { rotation: { ax: 0 }, x: 0 }
   → cubeSetting. で rotation / x、cubeSetting.rotation. で ax を候補に出す。
   定義へのジャンプでも、キーの場所(offset)を使う。 */

export type ObjNode = { offset: number; children?: ObjTree };
export type ObjTree = Map<string, ObjNode>;

const ID = "[\\p{L}_$][\\p{L}\\p{N}_$]*";
const ID_START = /[\p{L}_$]/u;
const ID_CHAR = /[\p{L}\p{N}_$]/u;
const MODIFIERS = new Set(["get", "set", "async", "static"]);

// 空白とコメントをとばす
const skipSpace = (s: string, i: number) => {
  while (i < s.length) {
    if (/\s/.test(s[i])) i++;
    else if (s[i] === "/" && s[i + 1] === "/") {
      while (i < s.length && s[i] !== "\n") i++;
    } else if (s[i] === "/" && s[i + 1] === "*") {
      const e = s.indexOf("*/", i + 2);
      i = e === -1 ? s.length : e + 2;
    } else break;
  }
  return i;
};

// 文字列の終わりのつぎ(i は開きクォートの位置)
const skipString = (s: string, i: number) => {
  const q = s[i];
  i++;
  while (i < s.length) {
    if (s[i] === "\\") i += 2;
    else if (s[i] === q) return i + 1;
    else if (s[i] === "\n" && q !== "`") return i; // 閉じ忘れは行末でやめる
    else i++;
  }
  return s.length;
};

// 値のおわり(いちばん外側の「,」か、親の「}」)までとばす
const skipExpr = (s: string, i: number) => {
  let depth = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '"' || c === "'" || c === "`") i = skipString(s, i);
    else if (c === "/" && (s[i + 1] === "/" || s[i + 1] === "*")) i = skipSpace(s, i);
    else {
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") {
        if (depth === 0) return i;
        depth--;
      } else if (c === "," && depth === 0) return i;
      i++;
    }
  }
  return i;
};

// s[i] === "{" から始まるオブジェクトを読む
const parseObject = (s: string, i: number): { tree: ObjTree; end: number } => {
  const tree: ObjTree = new Map();
  i++;
  while (i < s.length) {
    i = skipSpace(s, i);
    if (i >= s.length) break;
    if (s[i] === "}") return { tree, end: i + 1 };
    if (s[i] === ",") {
      i++;
      continue;
    }
    if (s.startsWith("...", i)) {
      i = skipExpr(s, i + 3); // { ...other }
      continue;
    }

    // キー
    const readKey = (): { key: string | null; offset: number } | null => {
      if (s[i] === '"' || s[i] === "'") {
        const end = skipString(s, i);
        const k = { key: s.slice(i + 1, end - 1), offset: i + 1 };
        i = end;
        return k;
      }
      if (s[i] === "[") {
        i = skipExpr(s, i); // [計算したキー]
        if (s[i] === "]") i++;
        return { key: null, offset: i };
      }
      const start = i;
      while (i < s.length && ID_CHAR.test(s[i])) i++;
      return i === start ? null : { key: s.slice(start, i), offset: start };
    };

    let k = readKey();
    if (!k) {
      i++; // よめない文字はとばす
      continue;
    }
    // get foo() {} / async foo() {} のような前置き
    if (k.key && MODIFIERS.has(k.key)) {
      const j = skipSpace(s, i);
      if (j < s.length && (ID_START.test(s[j]) || s[j] === '"' || s[j] === "'" || s[j] === "[")) {
        i = j;
        k = readKey() ?? k;
      }
    }

    const j = skipSpace(s, i);
    const node: ObjNode = { offset: k.offset };
    if (s[j] === ":") {
      const v = skipSpace(s, j + 1);
      if (s[v] === "{") {
        const r = parseObject(s, v);
        node.children = r.tree;
        i = skipExpr(s, r.end);
      } else i = skipExpr(s, v);
    } else {
      i = skipExpr(s, j); // 省略形 { x } やメソッド foo() {}
    }
    if (k.key !== null) tree.set(k.key, node);
  }
  return { tree, end: s.length };
};

const DECL = new RegExp(
  `(?:^|[\\s;{}(,])(?:let|const|var|num|text|数|テキスト)[ \\t]+(${ID})[ \\t]*=[ \\t]*\\{`,
  "gmu"
);
const ASSIGN = new RegExp(`(?<![.\\p{L}\\p{N}_$])(${ID})((?:\\.${ID})+)[ \\t]*(?:=(?![=>])|\\+=|-=|\\*=|\\/=)`, "gu");

/** コードの中の「変数 = { ... }」を集める。名前 → 中身 */
export const scanObjects = (code: string): Map<string, ObjTree> => {
  const out = new Map<string, ObjTree>();
  for (const m of code.matchAll(DECL)) {
    const brace = (m.index ?? 0) + m[0].length - 1;
    out.set(m[1], parseObject(code, brace).tree);
  }
  if (out.size === 0) return out;

  // あとから足した項目: cubeSetting.color = "red"
  for (const m of code.matchAll(ASSIGN)) {
    let tree: ObjTree | undefined = out.get(m[1]);
    if (!tree) continue;
    const segs = m[2].slice(1).split(".");
    let pos = (m.index ?? 0) + m[1].length + 1;
    segs.forEach((seg, n) => {
      if (!tree) return;
      let node = tree.get(seg);
      if (!node) {
        node = { offset: pos };
        tree.set(seg, node);
      }
      if (n < segs.length - 1) node.children ??= new Map();
      tree = node.children;
      pos += seg.length + 1;
    });
  }
  return out;
};

/** a.b.c のように、道すじをたどる。なければ undefined */
export const walkObject = (tree: ObjTree | undefined, path: string[]): ObjTree | undefined => {
  for (const p of path) tree = tree?.get(p)?.children;
  return tree;
};
