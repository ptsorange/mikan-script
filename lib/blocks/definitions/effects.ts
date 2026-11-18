/* ブロックの定義: スプライトの効果と層(layer) */

// スプライトの効果(スクラッチの「〜の効果」)。[表示名, コードに入れる名前]
const EFFECT_OPTIONS: [string, string][] = [
  ["色", "color"],
  ["魚眼レンズ", "fisheye"],
  ["渦巻き", "whirl"],
  ["ピクセル化", "pixelate"],
  ["モザイク", "mosaic"],
  ["明るさ", "brightness"],
  ["幽霊", "ghost"],
];

export const EFFECT_BLOCKS: Record<string, unknown>[] = [
  {
    type: "mk_sprite_effect_set",
    message0: "%1 の %2 の効果を %3 にする",
    args0: [
      { type: "field_input", name: "SPRITE", text: "player" },
      { type: "field_dropdown", name: "EFFECT", options: EFFECT_OPTIONS },
      { type: "input_value", name: "VALUE" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
  {
    type: "mk_sprite_effect_change",
    message0: "%1 の %2 の効果を %3 ずつ変える",
    args0: [
      { type: "field_input", name: "SPRITE", text: "player" },
      { type: "field_dropdown", name: "EFFECT", options: EFFECT_OPTIONS },
      { type: "input_value", name: "VALUE" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
  {
    type: "mk_sprite_effect_clear",
    message0: "%1 の効果をぜんぶ消す",
    args0: [{ type: "field_input", name: "SPRITE", text: "player" }],
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
  {
    type: "mk_sprite_effect_value",
    message0: "%1 の %2 の効果",
    args0: [
      { type: "field_input", name: "SPRITE", text: "player" },
      { type: "field_dropdown", name: "EFFECT", options: EFFECT_OPTIONS },
    ],
    output: "Number",
    style: "mk_num",
  },
  {
    type: "mk_sprite_layer",
    message0: "%1 の層を %2 にする",
    args0: [
      { type: "field_input", name: "SPRITE", text: "player" },
      { type: "input_value", name: "LAYER" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
  {
    type: "mk_sprite_order",
    message0: "%1 を %2 動かす",
    args0: [
      { type: "field_input", name: "SPRITE", text: "player" },
      {
        type: "field_dropdown",
        name: "ORDER",
        options: [
          ["いちばん手前に", "toFront"],
          ["いちばん奥に", "toBack"],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
];
