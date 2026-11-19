/* ---------- トークン → JavaScript ---------- */

import type { Locale } from "@/lib/i18n";
import { MikanScriptError } from "./errors";
import { callArgs, between } from "./helpers";
import { collectExports, parseImports, resolveModules, type ImportDecl, type ModuleSources } from "./modules";
import { MODULE_LIB } from "./runtime/modules";
import { SPRITE_LIB } from "./runtime/sprites";
import { CONTROL, getLineNumber, type Token } from "./tokenizer";

type SyntaxChunk = {
  line: number;
  head: string;
  prefix: string;
  children?: SyntaxChunk[];
  suffix?: string;
  continuesPrev?: boolean;
};

const SKIP_LOC_HEAD = new Set(["else", "catch", "finally", ")", "]", ".", ",", ";"]);

// 構造化されたチャンクを JavaScript 文字列へ展開する
const renderChunks = (chunks: SyntaxChunk[]): string =>
  chunks.map((c) => c.prefix + (c.children ? renderChunks(c.children) : "") + (c.suffix ?? "")).join("");

// 先頭チャンク配列の中から、構文エラーが発生する最初の { file, line } を特定する
const testJsSyntax = (code: string): SyntaxError | null => {
  try {
    // 構文チェックのみで実行はしない
    new Function(`return async () => {\n${code}\n};`);
    return null;
  } catch (e) {
    return e instanceof SyntaxError ? e : null;
  }
};

const findChunkSyntaxError = (chunks: SyntaxChunk[], file: string, prefixWrap = "", suffixWrap = ""): { file: string; line: number; detail: string } | null => {
  // 複数文が連携するケース (if + else, try + catch/finally, block + ")") をまとめてグループ化
  const groups: SyntaxChunk[][] = [];
  for (const chunk of chunks) {
    if (chunk.continuesPrev && groups.length > 0) {
      groups[groups.length - 1].push(chunk);
    } else {
      groups.push([chunk]);
    }
  }

  let acc = "";
  for (const grp of groups) {
    const grpStr = renderChunks(grp);
    const err = testJsSyntax(prefixWrap + acc + grpStr + suffixWrap);
    if (err) {
      // グループ内のどのチャンクで壊れているか調べる
      for (let i = 0; i < grp.length; i++) {
        const sub = grp[i];
        if (sub.children) {
          const tailStr = grp
            .slice(i + 1)
            .map((c) => c.prefix + (c.suffix ?? ""))
            .join("");
          // まずヘッダ側だけで壊れているか確認
          const emptyBlockErr = testJsSyntax(
            prefixWrap + acc + renderChunks(grp.slice(0, i)) + sub.prefix + (sub.suffix ?? "") + tailStr + suffixWrap
          );
          if (emptyBlockErr) {
            return { file, line: sub.line, detail: emptyBlockErr.message };
          }
          // 子ブロックの中を再帰的に調べる
          const inner = findChunkSyntaxError(
            sub.children,
            file,
            prefixWrap + acc + renderChunks(grp.slice(0, i)) + sub.prefix,
            (sub.suffix ?? "") + tailStr + suffixWrap
          );
          if (inner) return inner;
        }
      }
      return { file, line: grp[0].line, detail: err.message };
    }
    acc += grpStr;
  }
  return null;
};

// JavaScriptに変換する(1 つのファイルぶん)
const compileUnit = (lines: Token[][], variables: string[], file: string) => {
  const sprites: string[] = [];
  const spriteChunks: SyntaxChunk[] = [];
  const fileJson = JSON.stringify(file);

  const locAssign = (lineNo: number) =>
    lineNo > 0 ? `__loc = __activeLoc = { file: ${fileJson}, line: ${lineNo} };\n` : "";

  const wrapTryCatch = (startLine: number, innerJs: string) =>
    `let __loc = { file: ${fileJson}, line: ${startLine || 1} };\ntry {\n${innerJs}} catch (__e) {\n__markErr(__e, __loc);\nthrow __e;\n}\n`;

  const compileLines = (lines: Token[][], variables: string[]): { js: string; chunks: SyntaxChunk[] } => {
    let js = "";
    const chunks: SyntaxChunk[] = [];

    for (const line of lines) {
      const lineNo = getLineNumber(line) ?? 1;
      const last = line[line.length - 1];
      const block = Array.isArray(last) ? (last as Token[][]) : null;
      const head = (block ? line.slice(0, -1) : line) as string[];
      const first = head[0] ?? "";
      const continuesPrev = SKIP_LOC_HEAD.has(first);

      // スプライト
      if (first === "sprite") {
        sprites.push(head[1]);
        variables.push(head[1]);

        let stmt = "";
        if (head[2] === "[") {
          // sprite enemys[]
          stmt = `const ${head[1]} = __makeGroup();\n`;
        } else if (head[2] === "=" && head[3] === "[" && head[4] === "]") {
          // sprite enemys = []
          stmt = `const ${head[1]} = __makeGroup();\n`;
        } else if (["makeSprite", "makeShapeSprite", "makeTextSprite", "oldMakeTextSprite"].includes(head[3])) {
          const args = callArgs(head, 4);
          stmt = `const ${head[1]} = ${head[3]}(${args.join(", ")});\n`;
        }
        if (stmt) {
          spriteChunks.push({ line: lineNo, head: first, prefix: locAssign(lineNo) + stmt });
        }
      } else if (first === "import") {
        // import は compile() が先に処理しているので、ここでは何もしない
      } else if (first === "foreach") {
        const comma = head.indexOf(",");
        const name = head[comma - 1];
        const list = head.slice(comma + 1, -1).join(" ");
        const inner = compileLines(block ?? [], [...variables, name]);
        const prefix = `${locAssign(lineNo)}for (const ${name} of [...(${list})]) {\nawait __tick();\n`;
        const suffix = `}\n`;
        js += prefix + inner.js + suffix;
        chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix });
      } else if (first === "for") {
        const decl = between(head, "(", ",");
        const name = decl[decl.length - 1];
        const count = between(head, ",", ")").join(" ");
        const inner = compileLines(block ?? [], [...variables, name]);
        const prefix = `${locAssign(lineNo)}for (let ${name} = 0, __n = (${count}); ${name} < __n; ${name}++) {\n`;
        const suffix = `}\n`;
        js += prefix + inner.js + suffix;
        chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix });
      } else if (first === "sleep") {
        const stmt = `${locAssign(lineNo)}await sleep(${head.slice(2, -1).join(" ")});\n`;
        js += stmt;
        chunks.push({ line: lineNo, head: first, prefix: stmt });
      } else if (first === "onStart") {
        const inner = compileLines(block ?? [], variables);
        const prefix = `${locAssign(lineNo)}__scripts.push(async () => {\nlet __loc = { file: ${fileJson}, line: ${lineNo} };\ntry {\n`;
        const suffix = `} catch (__e) {\n__markErr(__e, __loc);\nthrow __e;\n}\n});\n`;
        js += prefix + inner.js + suffix;
        chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix });
      } else if (first === "onKeyDown" || first === "onKeyUp") {
        const args = between(head, "(", ")");
        const arg = args[args.length - 1] ?? "key";
        const type = first === "onKeyDown" ? "keydown" : "keyup";
        const inner = compileLines(block ?? [], variables);
        const prefix = `${locAssign(lineNo)}__on("${type}", async (${arg}) => {\nlet __loc = { file: ${fileJson}, line: ${lineNo} };\ntry {\n`;
        const suffix = `} catch (__e) {\n__markErr(__e, __loc);\nthrow __e;\n}\n});\n`;
        js += prefix + inner.js + suffix;
        chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix });
      } else if (first === "async function" && block) {
        const inner = compileLines(block, variables);
        const prefix = `${locAssign(lineNo)}${head.join(" ")} {\nlet __loc = { file: ${fileJson}, line: ${lineNo} };\ntry {\n`;
        const suffix = `} catch (__e) {\n__markErr(__e, __loc);\nthrow __e;\n}\n}\n`;
        js += prefix + inner.js + suffix;
        chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix });
      } else if (CONTROL.includes(first) || variables.includes(first)) {
        const tick = first === "while" || first === "for" ? "await __tick();\n" : "";
        const locPrefix = continuesPrev ? "" : locAssign(lineNo);
        if (block) {
          const inner = compileLines(block, variables);
          const prefix = `${locPrefix}${head.join(" ")} {\n${tick}`;
          const suffix = `}\n`;
          js += prefix + inner.js + suffix;
          chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix, continuesPrev });
        } else {
          const stmt = `${locPrefix}${head.join(" ")};\n`;
          js += stmt;
          chunks.push({ line: lineNo, head: first, prefix: stmt, continuesPrev });
        }
      } else {
        const locPrefix = continuesPrev ? "" : locAssign(lineNo);
        if (block) {
          const inner = compileLines(block, variables);
          const prefix = `${locPrefix}${head.join(" ")} {\n`;
          const suffix = `}\n`;
          js += prefix + inner.js + suffix;
          chunks.push({ line: lineNo, head: first, prefix, children: inner.chunks, suffix, continuesPrev });
        } else {
          const stmt = `${locPrefix}${head.join(" ")};\n`;
          js += stmt;
          chunks.push({ line: lineNo, head: first, prefix: stmt, continuesPrev });
        }
      }
    }
    return { js, chunks };
  };

  const { js: body, chunks: bodyChunks } = compileLines(lines, variables);
  const spriteJs = renderChunks(spriteChunks);
  return { body, bodyChunks, spriteJs, spriteChunks, sprites, wrapTryCatch };
};

// JavaScriptに変換する。sources には、import できるコードファイル(code/xxx.code)のソースを渡す
export const compile = (
  lines: Token[][],
  variables: string[],
  sources: ModuleSources = {},
  locale: Locale = "ja",
  mainFile = "main.code"
): string => {
  const mainImports = parseImports(lines, mainFile, locale);
  const { order, idOf } = resolveModules(mainImports, sources, locale);

  // 先にファイルぜんぶを変換して、スプライトがあるかどうかを調べる
  const units = order.map((m) => ({ m, ...compileUnit(m.lines, [], m.path) }));
  const main = compileUnit(lines, variables, mainFile);

  // JS 構文エラーがあれば実行前に元のファイル・行番号つきで検出する
  const verifyUnitSyntax = (file: string, spriteChunks: SyntaxChunk[], bodyChunks: SyntaxChunk[]) => {
    const checkList = [...spriteChunks, ...bodyChunks];
    const wholeErr = testJsSyntax(renderChunks(checkList));
    if (!wholeErr) return;
    const found = findChunkSyntaxError(checkList, file) ?? { file, line: 1, detail: wholeErr.message };
    throw new MikanScriptError(
      locale === "en"
        ? `Syntax error on line ${found.line}: check brackets, commas, or expression syntax.`
        : `${found.line} 行目に書き方のまちがいがあります（括弧・カンマ・記号の抜けなどを確認してください）。`,
      { file: found.file, line: found.line, detail: found.detail }
    );
  };

  for (const u of units) {
    verifyUnitSyntax(u.m.path, u.spriteChunks, u.bodyChunks);
  }
  verifyUnitSyntax(mainFile, main.spriteChunks, main.bodyChunks);

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
  if (e?.message !== "stopped") { console.error(e); __postErr(e, e?.__msLoc ?? __activeLoc); }
})));
`;

  const drawLoop = spriteCount > 0
    ? `__drawPerFrame().catch(e => { if (e?.message !== "stopped") { console.error(e); __postErr(e, e?.__msLoc ?? __activeLoc); } });\n`
    : "";

  const push = (names: string[]) => (names.length ? `__drawOrder.push(${names.join(", ")});\n` : "");
  const importConsts = (imports: ImportDecl[]) =>
    imports.map((d) => `const ${d.alias} = ${idOf(d.path)};\n`).join("");

  // 1 つのコードファイル = 1 つの関数。外から使えるものだけを返す
  const modulesJs = units
    .map(
      ({ m, body, spriteJs, sprites, wrapTryCatch }) =>
        `const ${m.id} = __moduleProxy(${JSON.stringify(m.path)}, await (async () => {\n` +
        importConsts(m.imports) +
        wrapTryCatch(1, spriteJs + push(sprites) + body + `return { ${collectExports(m.lines)} };\n`) +
        `})());\n`
    )
    .join("");

  return (
    SPRITE_LIB +
    drawJs +
    drawLoop +
    (units.length ? MODULE_LIB + modulesJs : "") +
    importConsts(mainImports) +
    main.wrapTryCatch(1, main.spriteJs + push(main.sprites) + main.body) +
    runJs
  );
};
