import type { Locale } from "@/lib/i18n";

export class MikanScriptError extends Error {
  file?: string;
  line?: number;
  detail?: string;

  constructor(message: string, opts?: { file?: string; line?: number; detail?: string }) {
    super(message);
    this.name = "MikanScriptError";
    this.file = opts?.file;
    this.line = opts?.line;
    this.detail = opts?.detail;
  }
}

export type FormattedError = {
  message: string;
  detail?: string;
};

/**
 * JavaScript の生のエラーメッセージを、初心者にも分かりやすい説明文へ変換する。
 * 元のメッセージは detail として保持し、確認できるようにする。
 */
export function formatMikanError(raw: string, locale: Locale = "ja"): FormattedError {
  const msg = raw.trim();
  if (!msg) {
    return {
      message: locale === "en" ? "An unknown error occurred." : "不明なエラーが発生しました。",
    };
  }

  // "Uncaught ReferenceError: ..." のような接頭辞を剥がす
  const stripped = msg.replace(/^Uncaught\s+(?:[A-Za-z]+Error:\s*)?/, "");

  // 1. xxx is not defined
  const notDef =
    stripped.match(/^(?:ReferenceError:\s*)?([^\s:]+)\s+is not defined$/) ??
    stripped.match(/^(?:ReferenceError:\s*)?Can't find variable:\s*([^\s:]+)$/);
  if (notDef) {
    const name = notDef[1];
    return {
      message:
        locale === "en"
          ? `"${name}" is not defined. Check for typos, or declare it with num / text / sprite.`
          : `「${name}」という名前が定義されていません（スペルミスや、num / text / sprite の書き忘れを確認してください）。`,
      detail: msg,
    };
  }

  // 2. Cannot read properties of undefined/null (reading 'x')
  const readProp =
    stripped.match(/^(?:TypeError:\s*)?Cannot read propert(?:y|ies) of (undefined|null) \(reading '([^']+)'\)$/) ??
    stripped.match(/^(?:TypeError:\s*)?(undefined|null) is not an object \(evaluating '[^']*\.([^'.\s]+)'\)$/);
  if (readProp) {
    const prop = readProp[2];
    return {
      message:
        locale === "en"
          ? `Tried to read "${prop}" from something that does not exist (it may not be created yet or was already removed).`
          : `存在しないものから「${prop}」を読み取ろうとしました（まだ作られていないか、remove() で消された可能性があります）。`,
      detail: msg,
    };
  }

  // 3. Cannot set properties of undefined/null (setting 'x')
  const setProp = stripped.match(
    /^(?:TypeError:\s*)?Cannot set propert(?:y|ies) of (undefined|null) \(setting '([^']+)'\)$/
  );
  if (setProp) {
    const prop = setProp[2];
    return {
      message:
        locale === "en"
          ? `Tried to set "${prop}" on something that does not exist (check that the sprite or variable was created).`
          : `存在しないものに「${prop}」を設定しようとしました（スプライトや変数が作られているか確認してください）。`,
      detail: msg,
    };
  }

  // 4. X is not a function
  const notFn = stripped.match(/^(?:TypeError:\s*)?(.+?)\s+is not a function$/);
  if (notFn) {
    const target = notFn[1];
    return {
      message:
        locale === "en"
          ? `"${target}" is not a function and cannot be called (check spelling and parentheses).`
          : `「${target}」は関数ではないため呼び出せません（名前のスペルミスや () の付け間違いを確認してください）。`,
      detail: msg,
    };
  }

  // 5. Assignment to constant variable
  if (/Assignment to constant variable|Attempted to assign to readonly property/i.test(stripped)) {
    return {
      message:
        locale === "en"
          ? "Cannot reassign a constant variable (such as a sprite)."
          : "定数（sprite など）には別の値を入れ直せません。",
      detail: msg,
    };
  }

  // 6. Maximum call stack size exceeded
  if (/Maximum call stack size exceeded|too much recursion/i.test(stripped)) {
    return {
      message:
        locale === "en"
          ? "Infinite recursion detected (a function kept calling itself without stopping)."
          : "関数が自分自身を無限に呼び出し続けました（終了条件を確認してください）。",
      detail: msg,
    };
  }

  // 7. Unexpected token / SyntaxError
  if (/^(?:SyntaxError:\s*)?(Unexpected |missing |Invalid or unexpected token|Unterminated )/i.test(stripped)) {
    return {
      message:
        locale === "en"
          ? 'Syntax error: check for missing or extra brackets ( ) { }, commas ",", or quotes "...".'
          : '書き方にまちがいがあります（括弧 ( ) { }、カンマ ,、引用符 "..." の抜けや余分な記号を確認してください）。',
      detail: msg,
    };
  }

  // 8. Cannot access 'x' before initialization
  const tdz = stripped.match(/Cannot access '([^']+)' before initialization/);
  if (tdz) {
    return {
      message:
        locale === "en"
          ? `"${tdz[1]}" was used before it was declared. Move its declaration earlier.`
          : `「${tdz[1]}」が宣言される前に使われています。宣言を上の行に移動してください。`,
      detail: msg,
    };
  }

  return { message: msg };
}
