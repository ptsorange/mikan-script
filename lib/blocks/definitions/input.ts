import type { Locale } from "@/lib/i18n";

/* ブロックの定義: 入力(キー・マウス) */

export const getInputBlocks = (locale: Locale): Record<string, unknown>[] => {
  const en = locale === "en";
  return [
    {
      type: "mk_key_pressed",
      message0: en ? "key %1 pressed?" : "キー %1 が押されている",
      args0: [{ type: "field_input", name: "KEY", text: " " }],
      output: "Boolean",
      style: "mk_num",
    },
    {
      type: "mk_mouse_value",
      message0: en ? "mouse %1" : "マウスの %1",
      args0: [
        {
          type: "field_dropdown",
          name: "PROP",
          options: en
            ? [
                ["x", "x"],
                ["y", "y"],
                ["left button", "left"],
                ["middle button", "middle"],
                ["right button", "right"],
              ]
            : [
                ["x 座標", "x"],
                ["y 座標", "y"],
                ["左ボタン", "left"],
                ["中央ボタン", "middle"],
                ["右ボタン", "right"],
              ],
        },
      ],
      output: null,
      style: "mk_num",
    },
  ];
};
