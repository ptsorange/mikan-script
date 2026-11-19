import type { Locale } from "@/lib/i18n";

/* ブロックの定義: スプライトの効果と層(layer) */

const EFFECT_OPTIONS_JA: [string, string][] = [
  ["色", "color"],
  ["魚眼レンズ", "fisheye"],
  ["渦巻き", "whirl"],
  ["ピクセル化", "pixelate"],
  ["モザイク", "mosaic"],
  ["明るさ", "brightness"],
  ["幽霊", "ghost"],
];

const EFFECT_OPTIONS_EN: [string, string][] = [
  ["color", "color"],
  ["fisheye", "fisheye"],
  ["whirl", "whirl"],
  ["pixelate", "pixelate"],
  ["mosaic", "mosaic"],
  ["brightness", "brightness"],
  ["ghost", "ghost"],
];

export const getEffectBlocks = (locale: Locale): Record<string, unknown>[] => {
  const en = locale === "en";
  const opts = en ? EFFECT_OPTIONS_EN : EFFECT_OPTIONS_JA;
  return [
    {
      type: "mk_sprite_effect_set",
      message0: en ? "set %1 %2 effect to %3" : "%1 の %2 の効果を %3 にする",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "field_dropdown", name: "EFFECT", options: opts },
        { type: "input_value", name: "VALUE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
    {
      type: "mk_sprite_effect_change",
      message0: en ? "change %1 %2 effect by %3" : "%1 の %2 の効果を %3 ずつ変える",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "field_dropdown", name: "EFFECT", options: opts },
        { type: "input_value", name: "VALUE" },
      ],
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
    {
      type: "mk_sprite_effect_clear",
      message0: en ? "clear effects on %1" : "%1 の効果をぜんぶ消す",
      args0: [{ type: "field_input", name: "SPRITE", text: "player" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
    {
      type: "mk_sprite_effect_value",
      message0: en ? "%1 %2 effect" : "%1 の %2 の効果",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        { type: "field_dropdown", name: "EFFECT", options: opts },
      ],
      output: "Number",
      style: "mk_num",
    },
    {
      type: "mk_sprite_layer",
      message0: en ? "set %1 layer to %2" : "%1 の層を %2 にする",
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
      message0: en ? "move %1 to %2" : "%1 を %2 動かす",
      args0: [
        { type: "field_input", name: "SPRITE", text: "player" },
        {
          type: "field_dropdown",
          name: "ORDER",
          options: en
            ? [
                ["front", "toFront"],
                ["back", "toBack"],
              ]
            : [
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
};
