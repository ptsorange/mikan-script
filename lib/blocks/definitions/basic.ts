import type { Locale } from "@/lib/i18n";

/* ブロックの定義: 基本(スタートしたら・キー・ずっと・繰り返す・待つ・表示・スクリーンサイズ・ランダム) */

export const getBasicBlocks = (locale: Locale): Record<string, unknown>[] => {
  const en = locale === "en";
  return [
    {
      type: "mk_on_start",
      message0: en ? "when started %1 %2" : "スタートしたら %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      style: "mk_event",
    },
    {
      type: "mk_on_key",
      message0: en ? "when key %1 %2 %3" : "キーを %1 とき %2 %3",
      args0: [
        {
          type: "field_dropdown",
          name: "EVENT",
          options: en
            ? [
                ["pressed", "onKeyDown"],
                ["released", "onKeyUp"],
              ]
            : [
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
      message0: en ? "while %1 %2 %3" : "ずっと %1 の間 %2 %3",
      args0: [{ type: "input_value", name: "COND" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },
    {
      type: "mk_for",
      message0: en ? "repeat %2 times with %1 %3 %4" : "%1 を使って %2 回繰り返す %3 %4",
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
      message0: en ? "wait %1 ms" : "%1 ミリ秒待つ",
      args0: [{ type: "input_value", name: "MS" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_control",
    },
    {
      type: "mk_print",
      message0: en ? "print %1" : "表示 %1",
      args0: [{ type: "input_value", name: "VALUE" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
    {
      type: "mk_text",
      message0: '"%1"',
      args0: [{ type: "field_input", name: "TEXT", text: en ? "Hello" : "こんにちは" }],
      output: null,
      style: "mk_text",
    },
    {
      type: "mk_screen_size",
      message0: en ? "screen size width %1 height %2" : "スクリーンサイズ 幅 %1 高さ %2",
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
      message0: en ? "random %1 to %2" : "ランダム %1 から %2",
      args0: [
        { type: "input_value", name: "FROM" },
        { type: "input_value", name: "TO" },
      ],
      output: "Number",
      style: "mk_num",
    },
  ];
};
