/* ---------- コンパイラが使う、トークンまわりの小さな道具 ---------- */

export const callArgs = (tokens: string[], open: number): string[] => {
  const args: string[] = [];
  let depth = 0, cur: string[] = [];
  for (let i = open; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "(" || t === "[") { depth++; if (i === open) continue; }
    else if (t === ")" || t === "]") { depth--; if (depth === 0) break; }
    else if (t === "," && depth === 1) { args.push(cur.join(" ")); cur = []; continue; }
    cur.push(t);
  }
  if (cur.length) args.push(cur.join(" "));
  return args;
};

export const between = (tokens: string[], from: string, to: string) => {
  const i = tokens.indexOf(from);
  const j = tokens.lastIndexOf(to);
  if (i === -1 || j === -1 || j <= i) return [];
  return tokens.slice(i + 1, j);
};

export const getInside = (firstChar: string, lastChar: string, text: string) => {
  let inside = "";
  let i = text.indexOf(firstChar);
  let j = 1;

  while (i < text.length - 1 && j > 0) {
    i++;
    if (text[i] === firstChar) j++;
    if (text[i] === lastChar) j--;
    if (j > 0) {
      inside += text[i];
    }
  }
  return inside;
}
