/* ブロックの定義: スプライト(作る・動かす・向き・大きさ・当たり判定・マウスで調べる) */

export const SPRITE_BLOCKS: Record<string, unknown>[] = [
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
];
