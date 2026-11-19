/* ---------- 検索・置換 ---------- */

export type FindOptions = { caseSensitive: boolean; wholeWord: boolean; regex: boolean };
export type Match = { from: number; to: number };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 検索ことばを RegExp にする。正規表現がまちがっていたら null */
export const buildRegExp = (query: string, o: FindOptions): RegExp | null => {
  if (!query) return null;
  try {
    let src = o.regex ? query : escapeRe(query);
    if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_$])(?:${src})(?![\\p{L}\\p{N}_$])`;
    return new RegExp(src, "gmu" + (o.caseSensitive ? "" : "i"));
  } catch {
    return null;
  }
};

/** 見つかった場所をぜんぶ返す(多すぎるときは上限で止める) */
export const findMatches = (text: string, query: string, o: FindOptions, limit = 5000): Match[] => {
  const re = buildRegExp(query, o);
  if (!re) return [];
  const out: Match[] = [];
  for (const m of text.matchAll(re)) {
    if (m[0] === "") continue; // 空の一致は飛ばす
    const from = m.index ?? 0;
    out.push({ from, to: from + m[0].length });
    if (out.length >= limit) break;
  }
  return out;
};

/** caret 以降で最初の一致の番号(なければ最初)。back なら、caret より前 */
export const nearestIndex = (matches: Match[], caret: number, back = false): number => {
  if (!matches.length) return -1;
  if (back) {
    for (let i = matches.length - 1; i >= 0; i--) if (matches[i].to <= caret) return i;
    return matches.length - 1;
  }
  const i = matches.findIndex((m) => m.from >= caret);
  return i === -1 ? 0 : i;
};

/** 置換後の文字を作る(正規表現のときは $1 なども使える) */
export const replaceOne = (text: string, m: Match, query: string, to: string, o: FindOptions): string => {
  const re = buildRegExp(query, o);
  if (!re || !o.regex) return to;
  const one = new RegExp(re.source, re.flags.replace("g", ""));
  return text.slice(m.from, m.to).replace(one, to);
};
