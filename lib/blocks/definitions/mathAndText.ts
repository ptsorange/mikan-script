import type { Locale } from "@/lib/i18n";

/* ブロックの定義: 数学と文字列 */

export const getMathAndTextBlocks = (locale: Locale): Record<string, unknown>[] => {
  const en = locale === "en";
  return [
    {
      type: "mk_math_constant",
      message0: "%1",
      args0: [
        {
          type: "field_dropdown",
          name: "VALUE",
          options: en
            ? [
                ["π (pi)", "Math.PI"],
                ["e", "Math.E"],
              ]
            : [
                ["円周率 π", "Math.PI"],
                ["ネイピア数 e", "Math.E"],
              ],
        },
      ],
      output: "Number",
      style: "mk_num",
    },
    {
      type: "mk_round",
      message0: en ? "%2 of %1" : "%1 を %2 する",
      args0: [
        { type: "input_value", name: "VALUE" },
        {
          type: "field_dropdown",
          name: "MODE",
          options: en
            ? [
                ["round", "round"],
                ["ceil", "ceil"],
                ["floor", "floor"],
                ["abs", "abs"],
                ["sqrt", "sqrt"],
              ]
            : [
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
      message0: en ? "join %1 %2" : "%1 と %2 をつなげる",
      args0: [
        { type: "input_value", name: "A" },
        { type: "input_value", name: "B" },
      ],
      output: "String",
      style: "mk_text",
    },
    {
      type: "mk_text_contains",
      message0: en ? "%1 contains %2?" : "%1 に %2 が含まれる",
      args0: [
        { type: "input_value", name: "TEXT" },
        { type: "input_value", name: "FIND" },
      ],
      output: "Boolean",
      style: "mk_text",
    },
    {
      type: "mk_text_length",
      message0: en ? "length of %1" : "%1 の文字数",
      args0: [{ type: "input_value", name: "TEXT" }],
      output: "Number",
      style: "mk_text",
    },
  ];
};
