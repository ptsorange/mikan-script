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

    // 変数
    {
      type: "mk_set_variable",
      message0: "%1 を %2 にする",
      args0: [
        { type: "field_input", name: "VAR", text: "score" },
        { type: "input_value", name: "VALUE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_change_variable",
      message0: "%1 を %2 だけ増やす",
      args0: [
        { type: "field_input", name: "VAR", text: "score" },
        { type: "input_value", name: "VALUE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_foreach",
      message0: "%1 を使って %2 のそれぞれについて %3 %4",
      args0: [
        { type: "field_input", name: "VAR", text: "item" },
        { type: "input_value", name: "LIST" },
        { type: "input_dummy" },
        { type: "input_statement", name: "DO" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },

    // スプライト
    {
      type: "mk_sprite_create",
      message0: "スプライト %1 を画像 %2 x %3 y %4 で作る",
      args0: [
        { type: "field_input", name: "VAR", text: "player" },
        { type: "field_input", name: "TEXTURE", text: "player.png" },
        { type: "input_value", name: "X" },
        { type: "input_value", name: "Y" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_sprite_move",
      message0: "%1 を向いている方向に %2 動かす",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "input_value", name: "SPEED" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_sprite_position",
      message0: "%1 の x を %2 、y を %3 にする",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "input_value", name: "X" },
        { type: "input_value", name: "Y" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_sprite_rotate",
      message0: "%1 の向きを %2 度にする",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "input_value", name: "ANGLE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_sprite_size",
      message0: "%1 の大きさを %2 倍にする",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "input_value", name: "SIZE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_sprite_look_at",
      message0: "%1 を %2 の方向に向ける",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "field_input", name: "TARGET", text: "enemy" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_collision",
      message0: "%1 と %2 がぶつかった",
      args0: [
        { type: "field_input", name: "A", text: "player" },
        { type: "field_input", name: "B", text: "enemy" },
      ],
      output: "Boolean",
      style: "mk_num",
    },

    {
      type: "mk_sprite_hovering",
      message0: "%1 にマウスが乗っている",
      args0: [{ type: "field_input", name: "SPRITE", text: "player" }],
      output: "Boolean",
      style: "mk_num",
    },
    {
      type: "mk_sprite_clicking",
      message0: "%1 がクリックされている",
      args0: [{ type: "field_input", name: "SPRITE", text: "player" }],
      output: "Boolean",
      style: "mk_num",
    },

    // サウンド・ログ    // サウンド・ログ
    {
      type: "mk_play_sound",
      message0: "音 %1 を音量 %2 で鳴らす",
      args0: [
        { type: "field_input", name: "NAME", text: "jump.mp3" },
        { type: "input_value", name: "VOLUME" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_stop_sound",
      message0: "音 %1 を止める",
      args0: [{ type: "field_input", name: "NAME", text: "jump.mp3" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_clear_log",
      message0: "ログをクリア",
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },

    // 入力
    {
      type: "mk_key_pressed",
      message0: "キー %1 が押されている",
      args0: [{ type: "field_input", name: "KEY", text: " " }],
      output: "Boolean",
      style: "mk_num",
    },
    {
      type: "mk_mouse_value",
      message0: "マウスの %1",
      args0: [{
        type: "field_dropdown",
        name: "PROP",
        options: [
          ["x 座標", "x"],
          ["y 座標", "y"],
          ["左ボタン", "left"],
          ["中央ボタン", "middle"],
          ["右ボタン", "right"],
        ],
      }],
      output: null,
      style: "mk_num",
    },

    // 数学・文字列
    {
      type: "mk_math_constant",
      message0: "%1",
      args0: [{
        type: "field_dropdown",
        name: "VALUE",
        options: [["円周率 π", "Math.PI"], ["ネイピア数 e", "Math.E"]],
      }],
      output: "Number",
      style: "mk_num",
    },
    {
      type: "mk_round",
      message0: "%1 を %2 する",
      args0: [
        { type: "input_value", name: "VALUE" },
        {
          type: "field_dropdown",
          name: "MODE",
          options: [
            ["四捨五入", "round"],
            ["切り上げ", "ceil"],
            ["切り捨て", "floor"],
            ["絶対値", "abs"],
            ["平方根", "sqrt"],
          ],
        },
      ],
      output: "Number",
      style: "mk_num",
    },
    {
      type: "mk_text_join",
      message0: "%1 と %2 をつなげる",
      args0: [
        { type: "input_value", name: "A" },
        { type: "input_value", name: "B" },
      ],
      output: "String",
      style: "mk_text",
    },
    {
      type: "mk_text_contains",
      message0: "%1 に %2 が含まれる",
      args0: [
        { type: "input_value", name: "TEXT" },
        { type: "input_value", name: "FIND" },
      ],
      output: "Boolean",
      style: "mk_text",
    },
    {
      type: "mk_text_length",
      message0: "%1 の文字数",
      args0: [{ type: "input_value", name: "TEXT" }],
      output: "Number",
      style: "mk_text",
    },
  ]);
};

// 数・文字を最初から入れておく(空のままだと 0 や "" になってしまうので)
const num = (n: number) => `<shadow type="math_number"><field name="NUM">${n}</field></shadow>`;
const txt = (s: string) => `<shadow type="mk_text"><field name="TEXT">${s}</field></shadow>`;
const bool = `<shadow type="logic_boolean"><field name="BOOL">TRUE</field></shadow>`;

export const TOOLBOX = `
<xml>
  <category name="イベント" colour="45">
    <block type="mk_on_start"></block>
    <block type="mk_on_key"></block>
  </category>

  <category name="動き" colour="210">
    <block type="mk_sprite_create">
      <value name="X">${num(0)}</value>
      <value name="Y">${num(0)}</value>
    </block>
    <block type="mk_sprite_move"><value name="SPEED">${num(5)}</value></block>
    <block type="mk_sprite_position">
      <value name="X">${num(0)}</value>
      <value name="Y">${num(0)}</value>
    </block>
    <block type="mk_sprite_rotate"><value name="ANGLE">${num(0)}</value></block>
    <block type="mk_sprite_size"><value name="SIZE">${num(1)}</value></block>
    <block type="mk_sprite_look_at"></block>
  </category>

  <category name="見た目" colour="270">
    <block type="mk_print"><value name="VALUE">${txt("こんにちは")}</value></block>
    <block type="mk_clear_log"></block>
  </category>

  <category name="音" colour="300">
    <block type="mk_play_sound"><value name="VOLUME">${num(1)}</value></block>
    <block type="mk_stop_sound"></block>
  </category>

  <category name="制御" colour="30">
    <block type="controls_if"></block>
    <block type="mk_while"><value name="COND">${bool}</value></block>
    <block type="mk_for"><value name="COUNT">${num(10)}</value></block>
    <block type="mk_foreach"><value name="LIST"><shadow type="lists_create_with"></shadow></value></block>
    <block type="mk_sleep"><value name="MS">${num(1000)}</value></block>
  </category>

  <category name="調べる" colour="180">
    <block type="mk_key_pressed"></block>
    <block type="mk_mouse_value"></block>
    <block type="mk_sprite_hovering"></block>
    <block type="mk_sprite_clicking"></block>
    <block type="mk_collision"></block>
  </category>

  <category name="演算" colour="120">
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
    <block type="math_arithmetic"></block>
    <block type="math_modulo"></block>
    <block type="math_trig"></block>
    <block type="math_single"></block>
    <block type="math_number"></block>
    <block type="mk_random"><value name="FROM">${num(1)}</value><value name="TO">${num(10)}</value></block>
    <block type="mk_round"><value name="VALUE">${num(3.14)}</value></block>
    <block type="mk_math_constant"></block>
  </category>

  <category name="変数" colour="30">
    <block type="mk_set_variable"><value name="VALUE">${num(0)}</value></block>
    <block type="mk_change_variable"><value name="VALUE">${num(1)}</value></block>
  </category>

  <category name="リスト" colour="15">
    <block type="lists_create_with"></block>
    <block type="lists_length"></block>
    <block type="lists_isEmpty"></block>
    <block type="lists_getIndex"></block>
    <block type="lists_setIndex"></block>
    <block type="lists_indexOf"></block>
  </category>

  <category name="文字列" colour="160">
    <block type="mk_text"></block>
    <block type="mk_text_join"><value name="A">${txt("Hello ")}</value><value name="B">${txt("World")}</value></block>
    <block type="mk_text_contains"><value name="TEXT">${txt("みかん")}</value><value name="FIND">${txt("か")}</value></block>
    <block type="mk_text_length"><value name="TEXT">${txt("みかん")}</value></block>
    <block type="text_join"></block>
    <block type="text_length"></block>
    <block type="text_isEmpty"></block>
  </category>

  <category name="ステージ" colour="210">
    <block type="mk_screen_size"><value name="W">${num(400)}</value><value name="H">${num(300)}</value></block>
  </category>
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
    case "logic_null":
      return "null";
    case "logic_negate":
      return `(!${value(block, "BOOL", "false")})`;
    case "logic_operation": {
      const op = block.getFieldValue("OP") === "AND" ? "&&" : "||";
      return `(${value(block, "A", "false")} ${op} ${value(block, "B", "false")})`;
    }
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
    case "math_modulo":
      return `(${value(block, "DIVIDEND", "0")} % ${value(block, "DIVISOR", "1")})`;
    case "math_single": {
      const v = value(block, "NUM", "0");
      const op = String(block.getFieldValue("OP"));
      const funcs: Record<string, string> = {
        ROOT: "sqrt", ABS: "abs", LN: "log", LOG10: "log10",
        EXP: "exp", ROUND: "round", ROUNDUP: "ceil", ROUNDDOWN: "floor",
        SIN: "sin", COS: "cos", TAN: "tan", ASIN: "asin",
        ACOS: "acos", ATAN: "atan",
      };
      if (op === "NEG") return `(-(${v}))`;
      if (op === "POW10") return `(10 ** (${v}))`;
      return funcs[op] ? `Math.${funcs[op]}(${v})` : fallback(block);
    }
    case "math_trig": {
      const op = String(block.getFieldValue("OP"));
      const funcs: Record<string, string> = {
        SIN: "sin", COS: "cos", TAN: "tan",
        ASIN: "asin", ACOS: "acos", ATAN: "atan",
      };
      return funcs[op]
        ? `Math.${funcs[op]}(${value(block, "NUM", "0")} * Math.PI / 180)`
        : fallback(block);
    }
    case "mk_math_constant":
      return String(block.getFieldValue("VALUE") ?? "Math.PI");
    case "mk_round": {
      const op = String(block.getFieldValue("MODE") ?? "round");
      return `Math.${op}(${value(block, "VALUE", "0")})`;
    }
    case "mk_key_pressed":
      return `isKey(${JSON.stringify(String(block.getFieldValue("KEY") ?? ""))})`;
    case "mk_mouse_value":
      return `mouse.${String(block.getFieldValue("PROP") ?? "x")}`;
    case "mk_sprite_hovering":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.isHovering()`;
    case "mk_sprite_clicking":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.isClicking()`;
    case "mk_collision":
      return `collide(${String(block.getFieldValue("A") ?? "player")}, ${String(block.getFieldValue("B") ?? "enemy")})`;
    case "mk_text_join":
      return `(String(${value(block, "A", '""')}) + String(${value(block, "B", '""')}))`;
    case "mk_text_contains":
      return `String(${value(block, "TEXT", '""')}).includes(String(${value(block, "FIND", '""')}))`;
    case "mk_text_length":
      return `String(${value(block, "TEXT", '""')}).length`;
    case "text_join": {
      const parts = block.inputList
        .filter((input) => input.name?.startsWith("ADD"))
        .map((input) => value(block, input.name!, '""'));
      return parts.length ? parts.map((part) => `String(${part})`).join(" + ") : '""';
    }
    case "text_length":
      return `String(${value(block, "VALUE", '""')}).length`;
    case "text_isEmpty":
      return `(String(${value(block, "VALUE", '""')}).length === 0)`;
    case "lists_create_with": {
      const parts = block.inputList
        .filter((input) => input.name?.startsWith("ADD"))
        .map((input) => value(block, input.name!, "null"));
      return `[${parts.join(", ")}]`;
    }
    case "lists_length":
      return `(${value(block, "VALUE", "[]")}).length`;
    case "lists_isEmpty":
      return `((${value(block, "VALUE", "[]")}).length === 0)`;
    case "lists_indexOf": {
      const method = block.getFieldValue("END") === "LAST" ? "lastIndexOf" : "indexOf";
      return `(${value(block, "VALUE", "[]")}).${method}(${value(block, "FIND", "null")})`;
    }
    case "lists_getIndex": {
      const list = value(block, "VALUE", "[]");
      const at = value(block, "AT", "0");
      const where = String(block.getFieldValue("WHERE"));
      if (where === "FIRST") return `(${list})[0]`;
      if (where === "LAST") return `(${list})[(${list}).length - 1]`;
      if (where === "FROM_END") return `(${list})[(${list}).length - 1 - (${at})]`;
      return `(${list})[${at}]`;
    }
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
    case "mk_foreach": {
      const raw = String(block.getFieldValue("VAR") ?? "item").trim();
      const v = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(raw) ? raw : "item";
      return `foreach (${v}, ${value(block, "LIST", "[]")}) {\n${body(block, "DO")}}`;
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
    case "mk_set_variable": {
      const raw = String(block.getFieldValue("VAR") ?? "value").trim();
      const v = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(raw) ? raw : "value";
      return `num ${v} = ${value(block, "VALUE", "0")}`;
    }
    case "mk_change_variable": {
      const raw = String(block.getFieldValue("VAR") ?? "score").trim();
      const v = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(raw) ? raw : "score";
      return `${v} += ${value(block, "VALUE", "1")}`;
    }
    case "mk_clear_log":
      return "clearLog()";
    case "mk_sprite_create": {
      const raw = String(block.getFieldValue("VAR") ?? "player").trim();
      const v = /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(raw) ? raw : "player";
      const texture = JSON.stringify(String(block.getFieldValue("TEXTURE") ?? ""));
      return `sprite ${v} = makeSprite(${texture}, ${value(block, "X", "0")}, ${value(block, "Y", "0")})`;
    }
    case "mk_sprite_move":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.move(${value(block, "SPEED", "5")})`;
    case "mk_sprite_position": {
      const sprite = String(block.getFieldValue("SPRITE") ?? "player");
      return `${sprite}.x = ${value(block, "X", "0")}\n${sprite}.y = ${value(block, "Y", "0")}`;
    }
    case "mk_sprite_rotate":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.r = ${value(block, "ANGLE", "0")}`;
    case "mk_sprite_size":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.size = ${value(block, "SIZE", "1")}`;
    case "mk_sprite_look_at": {
      const sprite = String(block.getFieldValue("SPRITE") ?? "player");
      const target = String(block.getFieldValue("TARGET") ?? "enemy");
      return `${sprite}.lookAt(${target})`;
    }
    case "mk_play_sound":
      return `playSound(${JSON.stringify(String(block.getFieldValue("NAME") ?? ""))}, ${value(block, "VOLUME", "1")})`;
    case "mk_stop_sound":
      return `stopSound(${JSON.stringify(String(block.getFieldValue("NAME") ?? ""))})`;
    case "mk_screen_size":
      return `setScreenSize(${value(block, "W", "400")}, ${value(block, "H", "300")})`;
    case "lists_setIndex": {
      const list = value(block, "LIST", "[]");
      const at = value(block, "AT", "0");
      const item = value(block, "TO", "null");
      const where = String(block.getFieldValue("WHERE"));
      const index = where === "FIRST" ? "0"
        : where === "LAST" ? `(${list}).length - 1`
        : where === "FROM_END" ? `(${list}).length - 1 - (${at})`
        : at;
      return `(${list})[${index}] = ${item}`;
    }
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
