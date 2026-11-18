/* ---------- コードをトークンに分けて、{ } のブロックで入れ子にする ---------- */

import { commands } from "./commands";

export type Token = string | Token[];

const TOKEN_RE = new RegExp(
  [
    String.raw`\/\/[^\n]*`,
    String.raw`"(?:\\.|[^"\\\n])*"?`,
    String.raw`'(?:\\.|[^'\\\n])*'?`,
    String.raw`\`(?:\\.|[^\`\\])*\`?`,
    String.raw`\n|;`,
    String.raw`[ \t\r]+`,
    String.raw`\d+(?:\.\d+)?(?:[eE][+-]?\d+)?`,
    String.raw`===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>`,
    String.raw`[.,:?!%()=<>+\-*\/|&\[\]{}]`,
    String.raw`[^\s.,:?!%()=<>+\-*\/|&\[\]{}"'\`;]+`,
  ].join("|"),
  "g"
);

export const CONTROL = ["if", "else", "while", "for"];

const ALIASES: Record<string, string> = {
  text: "let",
  num: "let",
  print: "addLog",
  println: "addLogLn",
  PI: "Math.PI",
  function: "async function",
};

// コードをトークンずつに分ける
export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];
  let line: Token[] | null = null;
  let prev = false;
  let parenDepth = 0; // () のネストの深さ
  let bracketDepth = 0; // [] のネストの深さ
  let objectDepth = 0; // 式の中にある {} のネストの深さ

  // 先読み用。文字列・コメント・空白を除いた次のトークンを取得する。
  // `{ key : value }` の key が予約語と同じ名前でも変換しないために使う。
  const rawTokens = Array.from(code.matchAll(TOKEN_RE), ([token]) => token);
  const nextSignificant: (string | undefined)[] = new Array(rawTokens.length);
  let next: string | undefined;
  for (let i = rawTokens.length - 1; i >= 0; i--) {
    const t = rawTokens[i];
    nextSignificant[i] = next;
    if (t === "\n" || t === ";" || /^[ \t\r]+$/.test(t) || t.startsWith("//")) continue;
    next = t;
  }

  // この位置の `{` が JavaScript のオブジェクトリテラルかを判定する。
  // ブロック構文の先頭キーワードは従来どおりブロックとして扱う。
  const isObjectLiteralStart = (tokens: Token[] | null): boolean => {
    const head = (tokens ?? []).filter((t): t is string => typeof t === "string");
    if (head.length === 0) return false;

    const first = head[0];
    const blockStarters = [
      ...CONTROL,
      "else",
      "async function",
      "onStart",
      "onKeyDown",
      "onKeyUp",
      "foreach",
      "try",
      "catch",
      "finally",
    ];

    if (blockStarters.includes(first) || head.includes("function") || head.includes("async function")) {
      return false;
    }

    // アロー関数の `=> { ... }` はコードブロック。
    if (head[head.length - 1] === "=>") return false;

    // 配列・関数呼び出し・丸括弧の中にある {} は式として扱う。
    if (parenDepth > 0 || bracketDepth > 0 || objectDepth > 0) return true;

    const last = head[head.length - 1];
    if (["=", "return", "throw", "yield", "?", ":", ",", "&&", "||"].includes(last)) {
      return true;
    }

    // `const value = condition && { ... }` のような式も対象にする。
    if (head.includes("=") || head.includes("return")) return true;

    // それ以外の `{}` は Mikan Script のコードブロックとして扱う。
    return false;
  };

  for (let tokenIndex = 0; tokenIndex < rawTokens.length; tokenIndex++) {
    let t = rawTokens[tokenIndex];

    if (t === "\n" || t === ";") {
      // オブジェクトリテラルの中では改行で式を分割しない。
      // () や [] の中で改行を維持する従来の挙動もそのまま残す。
      if (parenDepth === 0 && bracketDepth === 0 && objectDepth === 0) line = null;
      continue;
    }
    if (/^[ \t\r]+$/.test(t) || t.startsWith("//")) continue;

    const commandIndex = commands.findIndex(command => command.jp === t);
    if (commandIndex !== -1) t = commands[commandIndex].en;

    const isPropertyKey = nextSignificant[tokenIndex] === ":";
    const declarationAlias = t === "num" || t === "text" || t === "function";
    // num / text / function は宣言キーワードとして使うときだけ変換する。
    // オブジェクト内の同名プロパティや値を `let` / `async function` にしない。
    if (!prev && ALIASES[t] && !isPropertyKey) {
      if (!declarationAlias || (objectDepth === 0 && (line === null || line.length === 0 || t === "function"))) {
        t = ALIASES[t];
      }
    }

    if (t === ".") prev = true;
    else prev = false;

    // 括弧の深さを更新(文字列トークンは括弧と一致しないので影響しない)
    if (t === "(") parenDepth++;
    else if (t === ")" && parenDepth > 0) parenDepth--;
    else if (t === "[") bracketDepth++;
    else if (t === "]" && bracketDepth > 0) bracketDepth--;

    if (t === "{") {
      if (isObjectLiteralStart(line)) {
        if (!line) {
          line = [];
          current().push(line);
        }
        line.push(t);
        objectDepth++;
      } else {
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
      }
    } else if (t === "}") {
      if (objectDepth > 0) {
        if (!line) {
          line = [];
          current().push(line);
        }
        line.push(t);
        objectDepth--;
      } else {
        if (stack.length > 1) stack.pop();
        line = null;
      }
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
