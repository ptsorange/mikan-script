export const commands = [
  { en: "print", jp: "表示" },
  { en: "text", jp: "テキスト" },
  { en: "num", jp: "数" },
  { en: "sprite", jp: "スプライト" },
  { en: "if", jp: "もし" },
  { en: "else", jp: "そうでなければ" },
  { en: "while", jp: "ずっと" },
  { en: "for", jp: "繰り返す" },
  { en: "times", jp: "回" },
  { en: "sleep", jp: "待つ" },
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
    String.raw`\/\/[^\n]*`,
    String.raw`"(?:\\.|[^"\\\n])*"?`,
    String.raw`'(?:\\.|[^'\\\n])*'?`,
    String.raw`\`(?:\\.|[^\`\\])*\`?`,
    String.raw`\n|;`,
    String.raw`[ \t\r]+`,
    String.raw`\d+(?:\.\d+)?`,
    String.raw`===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>`,
    String.raw`[.,:?!%()=<>+\-*\/|&\[\]{}]`,
    String.raw`[^\s.,:?!%()=<>+\-*\/|&\[\]{}"'\`;]+`,
  ].join("|"),
  "g"
);

const CONTROL = ["if", "else", "while", "for"];

// JavaScriptに変換する
export const compile = (lines: Token[][], variables: string[]): string => {
  const sprites: string[] = [];
  let spriteJs = "";

  const compileLines = (lines: Token[][], variables: string[]): string => {
    let js = "";
    for (const line of lines) {
      const last = line[line.length - 1];
      const block = Array.isArray(last) ? (last as Token[][]) : null;
      const head = (block ? line.slice(0, -1) : line) as string[];

      if (head[0] === "num" || head[0] === "text") {
        variables.push(head[1]);
        js += `let ${head[1]} ${head.slice(2).join(" ")};\n`;
      } else if (head[0] === "print") {
        js += `addLog(${head.slice(2, -1).join(" ")});\n`;
      } else if (head[0] === "sprite") {
        sprites.push(head[1]);
        variables.push(head[1]);
        if (head[3] === "makeShapeSprite") {
          spriteJs +=
            `const ${head[1]} = {
  x: ${head[5]},
  y: ${head[7]},
  h: ${head[9]},
  w: ${head[11]},
  color: ${head[13]},
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.h, this.w);
  }
};
`;
          js += "draw();\n";
        }
      } else if (head[0] === "for") {
        const name = head[2];
        const close = head.lastIndexOf(")");
        const count = head.slice(4, close).join(" ");
        js += `for (let ${name} = 0, __n = (${count}); ${name} < __n; ${name}++)`;
        js += ` {\n${compileLines(block ?? [], [...variables, name])}}\n`;
      } else if (head[0] === "sleep") {
        js += `await sleep(${head.slice(2, -1).join(" ")});\n`;
      } else if (CONTROL.includes(head[0]) || variables.includes(head[0])) {
        js += head.join(" ");
        js += block ? ` {\n${compileLines(block, variables)}}\n` : ";\n";
        // ${(head[0] == "while" && head[head.length - 1].indexOf("sleep") == -1) ? "await sleep(0);\n" : ""}
        if (!block && sprites.includes(head[0])) js += "draw();\n";
      } else {
        continue;
      }
    }
    return js;
  };

  const body = compileLines(lines, variables);

  const drawJs =
    `const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
${sprites.map(s => `  ${s}.draw();`).join("\n")}
};
`;
  return spriteJs + drawJs + body;
};

// コードをトークンずつに分ける
export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];
  let line: Token[] | null = null;

  for (let [t] of code.matchAll(TOKEN_RE)) {
    if (t === "\n" || t === ";") { line = null; continue; }
    if (/^[ \t\r]+$/.test(t) || t.startsWith("//")) continue;
    const commandIndex = commands.findIndex(command => command.jp === t);
    if (commandIndex !== -1) t = commands[commandIndex].en;

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