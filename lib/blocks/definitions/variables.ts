/* ブロックの定義: 変数と、リストのそれぞれ */

export const VARIABLE_BLOCKS: Record<string, unknown>[] = [
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
];
