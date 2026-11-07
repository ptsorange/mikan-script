export const commands = [
  { en: "print", jp: "表示" },
  { en: "println", jp: "改行で表示" },
  { en: "text", jp: "テキスト" },
  { en: "num", jp: "数" },
  { en: "sprite", jp: "スプライト" },
  { en: "if", jp: "もし" },
  { en: "else", jp: "そうでなければ" },
  { en: "while", jp: "ずっと" },
  { en: "for", jp: "繰り返す" },
  { en: "times", jp: "回" },
  { en: "sleep", jp: "待つ" },
  { en: "onStart", jp: "スタートしたら" },
  { en: "onKeyDown", jp: "キーを押したら" },
  { en: "onKeyUp", jp: "キーを離したら" },
  { en: "clearLog", jp: "ログをクリア" },
  { en: "setScreenSize", jp: "スクリーンサイズ" },
];

export const RUNTIME = `
(window.__cleanups ?? []).forEach(f => f()); 
window.__cleanups = [];
const __id = (window.__runId = (window.__runId ?? 0) + 1);
const __check = () => { if (window.__runId !== __id) throw new Error("stopped"); };
let __last = performance.now();

const sleep = async (ms) => {
  await new Promise((r) => setTimeout(r, ms));
  __check();                    
  __last = performance.now();
};
const __tick = async () => {
  __check();
  if (performance.now() - __last > 12) {
    await new Promise((r) => setTimeout(r, 0));
    __check();
    __last = performance.now();
  }
};
const __on = (type, fn) => {
  document.addEventListener(type, fn);
  window.__cleanups.push(() => document.removeEventListener(type, fn));
};
const __scripts = [];
`;

const callArgs = (tokens: string[], open: number): string[] => {
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

export const getCommand = (codeLine: any) => {
  return commands.findIndex(command => command.en === codeLine[0] || command.jp === codeLine[0]);
}

const between = (tokens: string[], from: string, to: string) => {
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
  const asyncScripts = [];

  const compileLines = (lines: Token[][], variables: string[]): string => {
    let js = "";
    for (const line of lines) {
      const last = line[line.length - 1];
      const block = Array.isArray(last) ? (last as Token[][]) : null;
      const head = (block ? line.slice(0, -1) : line) as string[];

      // if (head[0] === "num" || head[0] === "text") {
      //   variables.push(head[1]);
      //   js += `let ${head[1]} ${head.slice(2).join(" ")};\n`;
      // }
      // if (head[0] === "print") {
      //   js += `addLog(${head.slice(2, -1).join(" ")});\n`;
      // } 
      if (head[0] === "sprite") {
        sprites.push(head[1]);
        variables.push(head[1]);
        if (head[3] === "makeShapeSprite") {
          const [x, y, w, h, color] = callArgs(head, 4);
          spriteJs += `const ${head[1]} = {
  x: ${x ?? 0}, y: ${y ?? 0}, w: ${w ?? 50}, h: ${h ?? 50}, color: ${color ?? '"white"'},
  draw() { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.w, this.h); }
};\n`;
        }
      } else if (head[0] === "for") {
        const decl = between(head, "(", ",");
        const name = decl[decl.length - 1];
        const count = between(head, ",", ")").join(" ");
        js += `for (let ${name} = 0, __n = (${count}); ${name} < __n; ${name}++)`;
        js += ` {\n${compileLines(block ?? [], [...variables, name])}}\n`;
      } else if (head[0] === "sleep") {
        js += `await sleep(${head.slice(2, -1).join(" ")});\n`;
      } else if (head[0] === "onStart") {
        js += `__scripts.push(async () => {\n${compileLines(block ?? [], variables)}});\n`;
      } else if (head[0] === "onKeyDown" || head[0] === "onKeyUp") {
        const args = between(head, "(", ")");
        const arg = args[args.length - 1] ?? "key";
        const type = head[0] === "onKeyDown" ? "keydown" : "keyup";
        js += `__on("${type}", async (${arg}) => {\n${compileLines(block ?? [], variables)}});\n`;
      } else if (CONTROL.includes(head[0]) || variables.includes(head[0])) {
        js += head.join(" ");
        const tick = (head[0] === "while" || head[0] === "for") ? "await __tick();\n" : "";
        js += block
          ? ` {\n${tick}${compileLines(block, variables)}}\n`
          : ";\n";
        // ${(head[0] == "while" && block?.findIndex((b:any)=>b.startsWith("sleep"))) ? "await sleep(0);\n" : ""}
        if (!block && sprites.includes(head[0])) js += "draw();\n";
      } else {
        js += head.join(" ");
        js += block ? ` {\n${compileLines(block, variables)}}\n` : ";\n";
        if (!block && sprites.includes(head[0])) js += "draw();\n";
      }
    }
    const runJs = `
await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;
    return js;
  };

  const body = compileLines(lines, variables);
  const drawJs =
    `const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
${sprites.map(s => `  ${s}.draw();`).join("\n")}
};
`;
  const runJs =
    `await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;

  return spriteJs + drawJs + body + runJs;
};

const ALIASES: Record<string, string> = {
  text: "let",
  num: "let",
  print: "addLog",
};

// コードをトークンずつに分ける
export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];
  let line: Token[] | null = null;
  let prev = false;

  for (let [t] of code.matchAll(TOKEN_RE)) {
    if (t === "\n" || t === ";") { line = null; continue; }
    if (/^[ \t\r]+$/.test(t) || t.startsWith("//")) continue;
    const commandIndex = commands.findIndex(command => command.jp === t);
    if (commandIndex !== -1) t = commands[commandIndex].en;

    if (prev != true && ALIASES[t]) {
      t = ALIASES[t];
    }

    if (t == ".") prev = true;
    else prev = false;

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