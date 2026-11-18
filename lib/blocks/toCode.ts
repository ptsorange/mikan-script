import * as Blockly from "blockly";

/* ---------- ブロック → みかんスクリプトのコード ----------
   サイドバーのブロックを押すと、そのブロックをコードにしてエディタに入れる。
   変換のしかたを知らないブロックは runCode("ブロックの種類") にする。 */

const INDENT = "  ";

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
    case "mk_sprite_effect_value":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.getEffect(${JSON.stringify(String(block.getFieldValue("EFFECT") ?? "color"))})`;
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
    case "mk_sprite_effect_set":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.setEffect(${JSON.stringify(String(block.getFieldValue("EFFECT") ?? "color"))}, ${value(block, "VALUE", "0")})`;
    case "mk_sprite_effect_change":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.changeEffect(${JSON.stringify(String(block.getFieldValue("EFFECT") ?? "color"))}, ${value(block, "VALUE", "0")})`;
    case "mk_sprite_effect_clear":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.clearEffects()`;
    case "mk_sprite_layer":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.setLayer(${value(block, "LAYER", "0")})`;
    case "mk_sprite_order":
      return `${String(block.getFieldValue("SPRITE") ?? "player")}.${block.getFieldValue("ORDER") === "toBack" ? "toBack" : "toFront"}()`;
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
