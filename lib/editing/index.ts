/* ---------- エディタの入力補助(かっこ・インデント・整形・候補) ----------
   使う側は、これまでどおり "@/lib/editing" から読み込める。 */

export type { Edit } from "./shared";
export { lineState } from "./shared";
export { typeChar, backspace, enter, tab, toggleComment } from "./keys";
export { formatCode } from "./format";
export { getCompletions, applyCandidate, type Candidate, type Completion } from "./completion";
export { wholeLine, deleteLines, moveLines, copyLines, selectLine, insertLine, smartHome, wordAt, indentLines } from "./lines";
export { buildRegExp, findMatches, nearestIndex, replaceOne, type FindOptions, type Match } from "./find";
export { findDefinition, type Definition } from "./definition";
