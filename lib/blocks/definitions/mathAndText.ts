/* ブロックの定義: 数学と文字列 */

export const MATH_AND_TEXT_BLOCKS: Record<string, unknown>[] = [
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
];
