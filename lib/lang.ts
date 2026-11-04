
export const commands = [
  { en: "makeShapeSprite", jp: "図形スプライト作成" },
  { en: "move", jp: "動く" },
  { en: "text", jp: "文字" },
  { en: "num", jp: "数" },
  { en: "sprite", jp: "スプライト" },
  { en: "print", jp: "表示" },
];

export const getCommand = (codeLine: string) => {
  const name = codeLine.trim().split(/[ .(]/)[0];
  return commands.findIndex(command => command.en === name || command.jp === name);
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

export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];

  code.split(/[\n;]/).forEach(raw => {
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("//")) return;

    const tokens = trimmed
      .split(/([ .()=<>+\-*\/|&\[\]{}])/)
      .filter(t => t !== "" && t !== " ");

    let line: Token[] = [];

    for (const t of tokens) {
      if (t === "{") {
        const block: Token[][] = [];
        if (line.length > 0) {
          line.push(block);              
        } else {
          const last = current()[current().length - 1];
          if (last) last.push(block);
          else current().push([block]);
        }
        stack.push(block);
        line = [];
      } else if (t === "}") {
        if (stack.length > 1) stack.pop();
        line = [];
      } else {
        if (line.length === 0) current().push(line);
        line.push(t);
      }
    }
  });

  return root;
};