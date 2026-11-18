/* ---------- エディタの入力補助(かっこ・インデント・整形・候補) ----------
   使う側は、これまでどおり "@/lib/editing" から読み込める。 */

export type { Edit } from "./shared";
export { lineState } from "./shared";
export { typeChar, backspace, enter, tab, toggleComment } from "./keys";
export { formatCode } from "./format";
export { getCompletions, applyCandidate, type Candidate, type Completion } from "./completion";
