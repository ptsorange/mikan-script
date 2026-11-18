/* ---------- トークン → JavaScript ---------- */

import { callArgs, between } from "./helpers";
import { collectExports, parseImports, resolveModules, type ImportDecl, type ModuleSources } from "./modules";
import { MODULE_LIB } from "./runtime/modules";
import { SPRITE_LIB } from "./runtime/sprites";
import { CONTROL, type Token } from "./tokenizer";

// JavaScriptに変換する(1 つのファイルぶん)
const compileUnit = (lines: Token[][], variables: string[]) => {
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

      // スプライト
      if (head[0] === "sprite") {
        sprites.push(head[1]);
        variables.push(head[1]);

        if (head[2] === "[") {
          // sprite enemys[]
          spriteJs += `const ${head[1]} = __makeGroup();\n`;
        } else if (head[2] === "=" && head[3] === "[" && head[4] === "]") {
          // sprite enemys = []
          spriteJs += `const ${head[1]} = __makeGroup();\n`;
        } else if (["makeSprite", "makeShapeSprite", "makeTextSprite","oldMakeTextSprite"].includes(head[3])) {
          const args = callArgs(head, 4);
          spriteJs += `const ${head[1]} = ${head[3]}(${args.join(", ")});\n`;
        }
      } else if (head[0] === "import") {
        // import は compile() が先に処理しているので、ここでは何もしない
      } else if (head[0] === "foreach") {
        const comma = head.indexOf(",");
        const name = head[comma - 1];
        const list = head.slice(comma + 1, -1).join(" ");
        // [...] でコピーを回すので、ループ中の remove も安全
        js += `for (const ${name} of [...(${list})]) {\nawait __tick();\n${compileLines(block ?? [], [...variables, name])}}\n`;
      } else if (head[0] === "for") {
        const decl = between(head, "(", ",");
        const name = decl[decl.length - 1];
        const count = between(head, ",", ")").join(" ");
        js += `for (let ${name} = 0, __n = (${count}); ${name} < __n; ${name}++)`;
        js += ` {\n${compileLines(block ?? [], [...variables, name])}}\n`;

        //何ms待つsleep
      } else if (head[0] === "sleep") {
        js += `await sleep(${head.slice(2, -1).join(" ")});\n`;

        // 非同期でコードを実行するonStart
      } else if (head[0] === "onStart") {
        js += `__scripts.push(async () => {\n${compileLines(block ?? [], variables)}});\n`;

        // キーが押されたか離されたかを検知
      } else if (head[0] === "onKeyDown" || head[0] === "onKeyUp") {
        const args = between(head, "(", ")");
        const arg = args[args.length - 1] ?? "key";
        const type = head[0] === "onKeyDown" ? "keydown" : "keyup";
        js += `__on("${type}", async (${arg}) => {\n${compileLines(block ?? [], variables)}});\n`;

        // CONTROLの中身OR変数なら
      } else if (CONTROL.includes(head[0]) || variables.includes(head[0])) {
        js += head.join(" ");
        const tick = (head[0] === "while" || head[0] === "for") ? "await __tick();\n" : "";
        js += block
          ? ` {\n${tick}${compileLines(block, variables)}}\n`
          : ";\n";
        // ${(head[0] == "while" && block?.findIndex((b:any)=>b.startsWith("sleep"))) ? "await sleep(0);\n" : ""}
        if (!block && sprites.includes(head[0])) js;
      } else {
        js += head.join(" ");
        js += block ? ` {\n${compileLines(block, variables)}}\n` : ";\n";
        if (!block && sprites.includes(head[0])) js;
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
  return { body, spriteJs, sprites };
};

// JavaScriptに変換する。sources には、import できるコードファイル(code/xxx.code)のソースを渡す
export const compile = (lines: Token[][], variables: string[], sources: ModuleSources = {}): string => {
  const mainImports = parseImports(lines, "main.code");
  const { order, idOf } = resolveModules(mainImports, sources);

  // 先にファイルぜんぶを変換して、スプライトがあるかどうかを調べる
  const units = order.map((m) => ({ m, ...compileUnit(m.lines, []) }));
  const main = compileUnit(lines, variables);
  const spriteCount = main.sprites.length + units.reduce((n, u) => n + u.sprites.length, 0);

  // 描画は layer の小さい順(奥→手前)。同じ layer なら宣言順。
  // コードファイルのスプライトも、ここ(__drawOrder)に入る
  const drawJs =
    `const __drawOrder = [];
const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  __penPaint(); // ペンの絵は、スプライトより奥
  __drawAll(__drawOrder);
};
`;
  const runJs =
    `await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;

  const drawLoop = spriteCount > 0
    ? "__drawPerFrame().catch(e => { if (e?.message !== 'stopped') console.error(e); });\n"
    : "";

  const push = (names: string[]) => (names.length ? `__drawOrder.push(${names.join(", ")});\n` : "");
  const importConsts = (imports: ImportDecl[]) =>
    imports.map((d) => `const ${d.alias} = ${idOf(d.path)};\n`).join("");

  // 1 つのコードファイル = 1 つの関数。外から使えるものだけを返す
  const modulesJs = units
    .map(
      ({ m, body, spriteJs, sprites }) =>
        `const ${m.id} = __moduleProxy(${JSON.stringify(m.path)}, await (async () => {\n` +
        importConsts(m.imports) +
        spriteJs +
        push(sprites) +
        body +
        `return { ${collectExports(m.lines)} };\n})());\n`
    )
    .join("");

  return (
    SPRITE_LIB +
    drawJs +
    drawLoop +
    (units.length ? MODULE_LIB + modulesJs : "") +
    importConsts(mainImports) +
    main.spriteJs +
    push(main.sprites) +
    main.body +
    runJs
  );
};
