import { splitCode, type Token } from "./tokenizer";

/* ---------- コードファイル(import) ----------
   code/xxx.code に書いた関数・変数・スプライトを、別のコードから使えるようにする。
     import physic "/code/physic.code"
     physic.spawnBox(10, 10, 10, 10)
   ファイルは 1 回だけ読み込まれる(何回 import しても同じもの)。
   ファイルの一番上(ブロックの外)に書いた function / num / text / sprite が、
   「名前.」のあとで使える。 */

export type ModuleSources = Record<string, string>; // "code/physic.code" → ソース

const ID_RE = /^[\p{L}_$][\p{L}\p{N}_$]*$/u;

// "/code/physic.code" "code/physic.code" "physic.code" "physic" を、"code/physic.code" にそろえる(おかしければ "")
export const normalizeModulePath = (raw: string): string => {
  const n = raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/^(?:\.?\/)+/, "")
    .replace(/^code\//, "");
  if (!n || /[\s"'`/]/.test(n)) return "";
  return "code/" + (/\.code$/i.test(n) ? n : n + ".code");
};

export type ImportDecl = { alias: string; path: string };

const unquote = (t: string) =>
  /^["'`]/.test(t) ? (t.length > 1 && t.endsWith(t[0]) ? t.slice(1, -1) : t.slice(1)) : null;

const IMPORT_FORM = 'import 名前 "/code/ファイル.code" の形で書いてね';

const parseImportLine = (head: string[], where: string): ImportDecl => {
  const rest = head.slice(1);
  if (rest.length === 3 && rest[1] === "from") rest.splice(1, 1); // import 名前 from "パス" も書ける
  const fail = (msg: string): never => {
    throw new Error(`${where}: ${msg}`);
  };
  if (rest.length < 1 || rest.length > 2) return fail(IMPORT_FORM);
  const raw = unquote(rest[rest.length - 1]);
  if (raw === null) return fail('ファイルの名前は "…" で囲んでね。' + IMPORT_FORM);
  const path = normalizeModulePath(raw);
  if (!path) return fail(`「${raw}」は、コードファイルの名前として使えないよ。` + IMPORT_FORM);
  const alias = rest.length === 2 ? rest[0] : path.slice("code/".length).replace(/\.code$/i, "");
  if (!ID_RE.test(alias)) {
    return fail(`「${alias}」は、名前として使えないよ。名前をつけて import してね。` + IMPORT_FORM);
  }
  return { alias, path };
};

const headOf = (line: Token[]) => (Array.isArray(line[line.length - 1]) ? line.slice(0, -1) : line) as string[];
const blockOf = (line: Token[]) => (Array.isArray(line[line.length - 1]) ? (line[line.length - 1] as Token[][]) : null);

// いちばん上の import を集める。ブロックの中の import は、おしえてあげる
export const parseImports = (lines: Token[][], where: string): ImportDecl[] => {
  const nested = (ls: Token[][]) => {
    for (const line of ls) {
      if (line[0] === "import") throw new Error(`${where}: import は、いちばん上(ブロックの外)に書いてね`);
      const b = blockOf(line);
      if (b) nested(b);
    }
  };
  const out: ImportDecl[] = [];
  for (const line of lines) {
    const head = headOf(line);
    if (head[0] === "import") out.push(parseImportLine(head, where));
    else {
      const b = blockOf(line);
      if (b) nested(b);
    }
  }
  return out;
};

// ファイルの一番上にある関数・変数・スプライトの名前(= 「名前.」で使えるもの)
export const collectExports = (lines: Token[][]) => {
  const fns = new Set<string>();
  const sprs = new Set<string>();
  const vars = new Set<string>();
  for (const line of lines) {
    const head = headOf(line);
    const name = head[1];
    if (typeof name !== "string" || !ID_RE.test(name)) continue;
    if (head[0] === "async function" && head[2] === "(") fns.add(name);
    else if (head[0] === "sprite") sprs.add(name);
    else if (head[0] === "let") vars.add(name);
  }
  vars.forEach((v) => (fns.has(v) || sprs.has(v)) && vars.delete(v));
  return [
    ...[...fns, ...sprs],
    // 変数は、外から読み書きしても、ファイルの中の変数に反映されるようにする
    ...[...vars].map((v) => `get ${v}() { return ${v}; }, set ${v}(__v) { ${v} = __v; }`),
  ].join(", ");
};

type ModuleUnit = { id: string; path: string; lines: Token[][]; imports: ImportDecl[] };

// import をたどって、「先に読み込むもの」が前になる順に並べる
export const resolveModules = (mainImports: ImportDecl[], sources: ModuleSources) => {
  const order: ModuleUnit[] = [];
  const ids = new Map<string, string>();
  const visiting: string[] = [];

  const visit = (path: string) => {
    if (ids.has(path)) return;
    const at = visiting.indexOf(path);
    if (at !== -1) {
      throw new Error("import がぐるぐる回ってるよ: " + [...visiting.slice(at), path].join(" → "));
    }
    const src = sources[path];
    if (src === undefined) {
      throw new Error(`「${path}」が見つからないよ。左のコード一覧と同じ名前か、たしかめてね。`);
    }
    visiting.push(path);
    const lines = splitCode(src);
    const imports = parseImports(lines, path);
    imports.forEach((d) => visit(d.path));
    visiting.pop();
    const id = "__mod" + ids.size;
    ids.set(path, id);
    order.push({ id, path, lines, imports });
  };

  mainImports.forEach((d) => visit(d.path));
  return { order, idOf: (path: string) => ids.get(path) as string };
};
