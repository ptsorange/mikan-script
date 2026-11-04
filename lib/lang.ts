
export const commands = [
  { en: "print", jp: "表示" },
  { en: "text", jp: "テキスト" },
  { en: "num", jp: "数" },
];

export const getCommand = (codeLine: any) => {
  return commands.findIndex(command => command.en === codeLine[0] || command.jp === codeLine[0]);
}

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

type Token = string | Token[];

const TOKEN_RE = new RegExp(
  [
    String.raw`\/\/[^\n]*`,              // 行コメント
    String.raw`"(?:\\.|[^"\\\n])*"?`,    // "文字列"
    String.raw`'(?:\\.|[^'\\\n])*'?`,    // '文字列'
    String.raw`\`(?:\\.|[^\`\\])*\`?`,   // `文字列`
    String.raw`\n|;`,                    // 行の区切り
    String.raw`[ \t\r]+`,                // 空白
    String.raw`[.()=<>+\-*\/|&\[\]{}]`,  // 区切り記号（1文字ずつトークン）
    String.raw`[^\s.()=<>+\-*\/|&\[\]{}"'\`;]+`, // 識別子・数値など
  ].join("|"),
  "g"
);

export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];
  let line: Token[] | null = null;

  for (const [t] of code.matchAll(TOKEN_RE)) {
    if (t === "\n" || t === ";") { line = null; continue; }   
    if (/^[ \t\r]+$/.test(t) || t.startsWith("//")) continue; 

    if (t === "{") {
      const block: Token[][] = [];
      if (line) {
        line.push(block);
      } else {
        const last = current()[current().length - 1];
        if (last) last.push(block);
        else current().push([block]);
      }
      stack.push(block);
      line = null;
    } else if (t === "}") {
      if (stack.length > 1) stack.pop();
      line = null;
    } else {
      if (!line) {
        line = [];
        current().push(line);
      }
      line.push(t);
    }
  }

  return root;
};