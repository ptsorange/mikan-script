import * as Blockly from "blockly";

/* ---------- ブロック → みかんスクリプトのコード ----------
   サイドバーのブロックを押すと、そのブロックをコードにしてエディタに入れる。
   変換のしかたを知らないブロックは runCode("ブロックの種類") にする。 */

const INDENT = "  ";

// このアプリ専用のブロック(Blockly 標準のブロックにないもの)
let defined = false;
export const defineMikanBlocks = () => {
  if (defined) return;
  defined = true;
  Blockly.common.defineBlocksWithJsonArray([
    {
      type: "mk_on_start",
      message0: "スタートしたら %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      style: "mk_event",
    },
    {
      type: "mk_on_key",
      message0: "キーを %1 とき %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "EVENT",
          options: [
            ["押した", "onKeyDown"],
            ["離した", "onKeyUp"],
          ],
        },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      style: "mk_event",
    },
    {
      type: "mk_while",
      message0: "ずっと %1 の間 %2 %3",
      args0: [{ type: "input_value", name: "COND" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },
    {
      type: "mk_for",
      message0: "%1 を使って %2 回繰り返す %3 %4",
      args0: [
        { type: "field_input", name: "VAR", text: "i" },
        { type: "input_value", name: "COUNT" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },
    {
      type: "mk_sleep",
      message0: "%1 ミリ秒待つ",
      args0: [{ type: "input_value", name: "MS" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },
    {
      type: "mk_print",
      message0: "表示 %1",
      args0: [{ type: "input_value", name: "VALUE" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
    {
      type: "mk_text",
      message0: "\"%1\"",
      args0: [{ type: "field_input", name: "TEXT", text: "こんにちは" }],
      output: null,
      style: "mk_text",
    },
    {
      type: "mk_screen_size",
      message0: "スクリーンサイズ 幅 %1 高さ %2",
      args0: [
        { type: "input_value", name: "W" },
        { type: "input_value", name: "H" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_random",
      message0: "ランダム %1 から %2",
      args0: [
        { type: "input_value", name: "FROM" },
        { type: "input_value", name: "TO" },
      ],
      output: "Number",
      style: "mk_num",
    },
  ]);
};

// 数・文字を最初から入れておく(空のままだと 0 や "" になってしまうので)
const num = (n: number) => `<shadow type="math_number"><field name="NUM">${n}</field></shadow>`;
const txt = (s: string) => `<shadow type="mk_text"><field name="TEXT">${s}</field></shadow>`;
const bool = `<shadow type="logic_boolean"><field name="BOOL">TRUE</field></shadow>`;

export const TOOLBOX = `
<xml>
  <label text="イベント"></label>
  <block type="mk_on_start"></block>
  <block type="mk_on_key"></block>
  <label text="せいぎょ"></label>
  <block type="controls_if"></block>
  <block type="mk_while"><value name="COND">${bool}</value></block>
  <block type="mk_for"><value name="COUNT">${num(10)}</value></block>
  <block type="mk_sleep"><value name="MS">${num(1000)}</value></block>
  <label text="見た目"></label>
  <block type="mk_print"><value name="VALUE">${txt("こんにちは")}</value></block>
  <block type="mk_screen_size"><value name="W">${num(400)}</value><value name="H">${num(300)}</value></block>
  <label text="演算"></label>
  <block type="logic_compare"></block>
  <block type="math_arithmetic"></block>
  <block type="mk_random"><value name="FROM">${num(1)}</value><value name="TO">${num(10)}</value></block>
  <block type="mk_text"></block>
  <block type="math_number"></block>
  <block type="logic_boolean"></block>
</xml>`;

/* ---------- 変換 ---------- */

// 変換できないブロック。runCode("ブロックの種類") にして、何のブロックだったかは残す
const fallback = (block: Blockly.Block) => `runCode(${JSON.stringify(block.type)})`;

// 値のつなぎ口(丸い・四角い穴)の中身。何もつながっていなければ def を使う
const value = (block: Blockly.Block, name: string, def: string): string => {
  const child = block.getInputTargetBlock(name);
  return child ? expression(child) : def;
};

// { } の中身。つながっているブロックを上から順に変換して、インデントをつける
const body = (block: Blockly.Block, name: string): string => {
  let out = "";
  for (let b = block.getInputTargetBlock(name); b; b = b.getNextBlock()) {
    out += statement(b)
      .split("\n")
      .map((l) => (l ? INDENT + l : l))
      .join("\n") + "\n";
  }
  return out;
};

const COMPARE: Record<string, string> = { EQ: "==", NEQ: "!=", LT: "<", LTE: "<=", GT: ">", GTE: ">=" };

// 値(式)になるブロック
const expression = (block: Blockly.Block): string => {
  switch (block.type) {
    case "math_number":
      return String(block.getFieldValue("NUM") ?? 0);
    case "mk_text":
      return JSON.stringify(String(block.getFieldValue("TEXT") ?? ""));
    case "logic_boolean":
      return block.getFieldValue("BOOL") === "TRUE" ? "true" : "false";
    case "logic_compare": {
      const op = COMPARE[block.getFieldValue("OP")];
      if (!op) return fallback(block);
      return `${value(block, "A", "0")} ${op} ${value(block, "B", "0")}`;
    }
    case "math_arithmetic": {
      const a = value(block, "A", "0");
      const b = value(block, "B", "0");
      switch (block.getFieldValue("OP")) {
        case "ADD": return `(${a} + ${b})`;
        case "MINUS": return `(${a} - ${b})`;
        case "MULTIPLY": return `(${a} * ${b})`;
        case "DIVIDE": return `(${a} / ${b})`;
        case "POWER": return `Math.pow(${a}, ${b})`;
        default: return fallback(block);
      }
    }
    case "mk_random":
      return `random(${value(block, "FROM", "0")}, ${value(block, "TO", "10")})`;
    default:
      return fallback(block);
  }
};

// 1 つの文になるブロック(中に { } を持つものは複数行になる)
const statement = (block: Blockly.Block): string => {
  switch (block.type) {
    case "mk_on_start":
      return `onStart {\n${body(block, "DO")}}`;
    case "mk_on_key":
      return `${block.getFieldValue("EVENT")}(e) {\n${body(block, "DO")}}`;
    case "mk_while":
      return `while (${value(block, "COND", "true")}) {\n${body(block, "DO")}}`;
    case "mk_for": {
      const name = String(block.getFieldValue("VAR") ?? "").trim();
      const v = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(name) ? name : "i"; // 変数名として使えない文字は i にする
      return `for (${v}, ${value(block, "COUNT", "10")}) {\n${body(block, "DO")}}`;
    }
    case "controls_if": {
      // 「でなければもし」「でなければ」を足したブロックにも対応
      const m = block as Blockly.Block & { elseifCount_?: number; elseCount_?: number };
      let out = "";
      for (let i = 0; i <= (m.elseifCount_ ?? 0); i++) {
        out += `${i === 0 ? "if" : " else if"} (${value(block, "IF" + i, "true")}) {\n${body(block, "DO" + i)}}`;
      }
      if (m.elseCount_) out += ` else {\n${body(block, "ELSE")}}`;
      return out;
    }
    case "mk_sleep":
      return `sleep(${value(block, "MS", "1000")})`;
    case "mk_print":
      return `print(${value(block, "VALUE", '""')})`;
    case "mk_screen_size":
      return `setScreenSize(${value(block, "W", "400")}, ${value(block, "H", "300")})`;
    default:
      // 値のブロック(数など)を押したときは、そのまま式として入れる。それも知らないブロックなら fallback
      return block.outputConnection ? expression(block) : fallback(block);
  }
};

/** ブロック 1 つ(下につながったブロックもふくむ)をコードにする。末尾に改行はつけない */
export const blockToCode = (block: Blockly.Block): string => {
  const parts: string[] = [];
  for (let b: Blockly.Block | null = block; b; b = b.getNextBlock()) parts.push(statement(b));
  return parts.join("\n");
};
