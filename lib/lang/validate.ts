import type { Locale } from "@/lib/i18n";
import { MikanScriptError } from "./errors";

type StackFrame =
  | { kind: "bracket"; ch: "(" | "[" | "{"; expected: ")" | "]" | "}"; line: number }
  | { kind: "template"; line: number }
  | { kind: "interp"; line: number };

const CLOSE_FOR: Record<"(" | "[" | "{", ")" | "]" | "}"> = {
  "(": ")",
  "[": "]",
  "{": "}",
};

/**
 * コンパイル前にソースコードの括弧・引用符の閉じ忘れや余分な閉じ括弧をチェックし、
 * 問題がある元の行番号を特定して MikanScriptError を投げる。
 */
export function validateSyntax(code: string, file: string, locale: Locale = "ja"): void {
  const stack: StackFrame[] = [];
  let line = 1;
  let i = 0;

  const fail = (lineNo: number, ja: string, en: string): never => {
    throw new MikanScriptError(locale === "en" ? en : ja, { file, line: lineNo });
  };

  while (i < code.length) {
    const top = stack[stack.length - 1];

    // テンプレートリテラル内 (`...`)
    if (top?.kind === "template") {
      const ch = code[i];
      if (ch === "\\") {
        if (code[i + 1] === "\r" && code[i + 2] === "\n") {
          line++;
          i += 3;
        } else {
          if (code[i + 1] === "\n") line++;
          i += 2;
        }
        continue;
      }
      if (ch === "`") {
        stack.pop();
        i++;
        continue;
      }
      if (ch === "$" && code[i + 1] === "{") {
        stack.push({ kind: "interp", line });
        i += 2;
        continue;
      }
      if (ch === "\n") line++;
      i++;
      continue;
    }

    const ch = code[i];

    if (ch === "\n") {
      line++;
      i++;
      continue;
    }

    // 行コメント
    if (ch === "/" && code[i + 1] === "/") {
      i += 2;
      while (i < code.length && code[i] !== "\n") i++;
      continue;
    }

    // ブロックコメント
    if (ch === "/" && code[i + 1] === "*") {
      const openLine = line;
      i += 2;
      let closed = false;
      while (i < code.length) {
        if (code[i] === "*" && code[i + 1] === "/") {
          i += 2;
          closed = true;
          break;
        }
        if (code[i] === "\n") line++;
        i++;
      }
      if (!closed) {
        fail(
          openLine,
          `${openLine} 行目のコメント /* が */ で閉じられていません。`,
          `Unclosed comment /* starting on line ${openLine}.`
        );
      }
      continue;
    }

    // 1行文字列 ("..." / '...')
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const openLine = line;
      i++;
      let closed = false;
      while (i < code.length) {
        const c = code[i];
        if (c === "\\") {
          if (code[i + 1] === "\r" && code[i + 2] === "\n") {
            line++;
            i += 3;
          } else if (code[i + 1] === "\n") {
            line++;
            i += 2;
          } else {
            i += 2;
          }
          continue;
        }
        if (c === quote) {
          closed = true;
          i++;
          break;
        }
        if (c === "\n" || c === "\r") {
          break;
        }
        i++;
      }
      if (!closed) {
        fail(
          openLine,
          `${openLine} 行目の文字列（${quote}...${quote}）が閉じられていません。`,
          `Unclosed string literal (${quote}...${quote}) on line ${openLine}.`
        );
      }
      continue;
    }

    // テンプレートリテラル開始
    if (ch === "`") {
      stack.push({ kind: "template", line });
      i++;
      continue;
    }

    // 開き括弧
    if (ch === "(" || ch === "[" || ch === "{") {
      stack.push({ kind: "bracket", ch, expected: CLOSE_FOR[ch], line });
      i++;
      continue;
    }

    // 閉じ括弧
    if (ch === ")" || ch === "]" || ch === "}") {
      if (ch === "}" && top?.kind === "interp") {
        stack.pop();
        i++;
        continue;
      }
      if (!top || top.kind !== "bracket") {
        return fail(
          line,
          `${line} 行目に余分な「${ch}」があります（対応する開き括弧がありません）。`,
          `Unexpected "${ch}" on line ${line} (no matching opening bracket).`
        );
      }
      if (top.expected !== ch) {
        return fail(
          line,
          `${line} 行目の「${ch}」が、${top.line} 行目の「${top.ch}」と対応していません（正しくは「${top.expected}」）。`,
          `Mismatched "${ch}" on line ${line} (expected "${top.expected}" to close "${top.ch}" from line ${top.line}).`
        );
      }
      stack.pop();
      i++;
      continue;
    }

    i++;
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    if (unclosed.kind === "template" || unclosed.kind === "interp") {
      fail(
        unclosed.line,
        `${unclosed.line} 行目のテンプレート文字列（\`...\`）が閉じられていません。`,
        `Unclosed template literal (\`...\`) starting on line ${unclosed.line}.`
      );
    } else {
      fail(
        unclosed.line,
        `${unclosed.line} 行目の「${unclosed.ch}」が「${unclosed.expected}」で閉じられていません。`,
        `"${unclosed.ch}" on line ${unclosed.line} is missing a closing "${unclosed.expected}".`
      );
    }
  }
}
