import type { Locale } from "@/lib/i18n";
import { normalizeModulePath } from "../../lang";

/* ---------- コードの中から、名前を見つける ---------- */

const ID = "[\\p{L}_$][\\p{L}\\p{N}_$]*";

/* ---------- コードファイル(import) ---------- */

// import の行: import 名前 "パス" / import "パス"(名前はファイル名)
const IMPORT_LINE = new RegExp(
  `^[ \\t]*(?:import|インポート)[ \\t]+(?:(${ID})(?:[ \\t]+from)?[ \\t]+)?["'\`]([^"'\`\\n]*)["'\`]`,
  "gmu"
);
// import の途中(パスの " の中)を打っているとき
export const IMPORT_PATH_TYPING = new RegExp(
  `^[ \\t]*(?:import|インポート)[ \\t]+(?:${ID}(?:[ \\t]+from)?[ \\t]+)?["'\`][^"'\`]*$`,
  "u"
);

// 名前 → コードファイルのパス(code/xxx.code)
export const scanImports = (code: string) => {
  const map = new Map<string, string>();
  for (const m of code.matchAll(IMPORT_LINE)) {
    const path = normalizeModulePath(m[2]);
    if (!path) continue;
    const alias = m[1] ?? path.slice("code/".length).replace(/\.code$/i, "");
    map.set(alias, path);
  }
  return map;
};

// コードファイルの一番上(行のいちばん左)にある、外から使える名前
export const scanExports = (src: string, locale: Locale = "ja"): [string, string][] => {
  const out: [string, string][] = [];
  const re = new RegExp(
    `^(?:(?:function|関数)[ \\t]+(${ID})[ \\t]*\\(([^)\\n]*)\\)|(?:num|数|text|テキスト|let)[ \\t]+(${ID})|(?:sprite|スプライト)[ \\t]+(${ID}))`,
    "gmu"
  );
  for (const m of src.matchAll(re)) {
    if (m[1]) out.push([m[1] + "(", locale === "en" ? `function(${m[2].trim()})` : `関数(${m[2].trim()})`]);
    else if (m[3]) out.push([m[3], locale === "en" ? "variable" : "変数"]);
    else if (m[4]) out.push([m[4], locale === "en" ? "sprite" : "スプライト"]);
  }
  return out;
};

/** コードの中で宣言された名前を集める */
export const scanNames = (code: string) => {
  const vars = new Set<string>();
  const sprites = new Set<string>();
  const groups = new Set<string>();
  const decl = new RegExp(
    `(?:^|[\\s;{}])(sprite|スプライト|num|数|text|テキスト|let|const|var|function|関数|import|インポート)\\s+(${ID})(\\s*\\[\\s*\\]|\\s*=\\s*\\[\\s*\\])?`,
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
