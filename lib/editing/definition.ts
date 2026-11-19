import { lineStart, lineState } from "./shared";
import { wordAt } from "./lines";
import { scanImports } from "./completion/scan";
import { scanObjects, walkObject } from "./completion/objects";

/* ---------- 定義へジャンプ(Ctrl + クリック) ----------
   クリックした名前が、どこで作られたか(function / num / const / スプライト / 引数 など)を探す。
   physic.spawnBox のように import したファイルのものは、そのファイルの中を探す。 */

export type Definition = {
  file: string | null; // null = 今開いているファイル。それ以外は "code/xxx.code"
  line: number; // 1から
  col: number; // 0から
  length: number; // 名前の長さ
};

const ID_CHAR = "[\\p{L}\\p{N}_$]";
const esc = (name: string) => name.replace(/\$/g, "\\$");

const locate = (src: string, offset: number) => {
  const before = src.slice(0, offset);
  const line = before.split("\n").length;
  return { line, col: offset - (before.lastIndexOf("\n") + 1) };
};

// ファイルの一番上(行のいちばん左)にある、名前の宣言
const findInModule = (src: string, name: string): number => {
  const re = new RegExp(
    `(?<=^(?:function|関数|num|数|text|テキスト|let|const|var|sprite|スプライト)[ \\t]+)${esc(name)}(?!${ID_CHAR})`,
    "mu"
  );
  return src.search(re);
};

// この名前を作っている場所を、ぜんぶ集める(名前の先頭の位置)
const findDeclarations = (v: string, name: string): number[] => {
  const n = esc(name);
  const end = `(?!${ID_CHAR})`;
  const patterns = [
    // function 名前
    `(?<=(?:function|関数)[ \\t]+)${n}${end}`,
    // num 名前 / const 名前 / sprite 名前 ...
    `(?<=(?:^|[\\s;{}(,])(?:sprite|スプライト|num|数|text|テキスト|let|const|var)[ \\t]+)${n}${end}`,
    // for (名前, 10) / foreach (名前, list)
    `(?<=(?:for|foreach|繰り返す|それぞれ)\\s*\\(\\s*)${n}(?=\\s*,)`,
    // function f(名前, b) / onKeyDown(名前)
    `(?<=(?:function|関数|onKeyDown|onKeyUp|キーを押したら|キーを離したら)\\s*(?:[\\p{L}_$][\\p{L}\\p{N}_$]*)?\\s*\\([^)\\n]*(?<!${ID_CHAR}))${n}${end}`,
    // import 名前 "..."
    `(?<=(?:import|インポート)[ \\t]+)${n}${end}`,
  ];
  const out: number[] = [];
  for (const p of patterns) {
    for (const m of v.matchAll(new RegExp(p, "gmu"))) out.push(m.index ?? 0);
  }
  return out.sort((a, b) => a - b);
};

/** offset(カーソルの位置)の名前の、定義を探す。見つからなければ null */
export const findDefinition = (
  v: string,
  offset: number,
  modules?: (path: string) => string | undefined
): Definition | null => {
  const w = wordAt(v, offset);
  if (!w) return null;
  const [from, to] = w;
  const name = v.slice(from, to);
  if (/^\d/.test(name)) return null;

  // 文字列・コメントの中は対象外
  const state = lineState(v.slice(lineStart(v, from), from));
  if (state.quote || state.comment) return null;

  const same = (at: number): Definition => ({ file: null, ...locate(v, at), length: name.length });
  const imports = scanImports(v);

  // a.b.name のように、「.」でつながっているとき
  const chain = new RegExp(`((?:${ID_CHAR}+\\.)+)$`, "u").exec(v.slice(lineStart(v, from), from));
  if (chain) {
    const parts = chain[1].slice(0, -1).split(".");
    const root = parts[0];
    const modPath = imports.get(root);
    if (modPath) {
      if (parts.length !== 1) return null;
      const src = modules?.(modPath);
      if (src === undefined) return null;
      const at = findInModule(src, name);
      return at === -1 ? null : { file: modPath, ...locate(src, at), length: name.length };
    }
    const node = walkObject(scanObjects(v).get(root), parts.slice(1))?.get(name);
    return node ? same(node.offset) : null;
  }

  // import した名前そのもの: そのコードファイルを開く
  const modPath = imports.get(name);
  if (modPath && modules?.(modPath) !== undefined) return { file: modPath, line: 1, col: 0, length: 0 };

  const decls = findDeclarations(v, name);
  if (decls.some((d) => d === from)) return null; // 宣言そのものをクリックした
  const before = decls.filter((d) => d < from);
  const at = before.length ? before[before.length - 1] : decls.find((d) => d > from);
  return at === undefined ? null : same(at);
};
