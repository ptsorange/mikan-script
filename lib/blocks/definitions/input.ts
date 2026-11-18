/* ブロックの定義: 入力(キー・マウス) */

export const INPUT_BLOCKS: Record<string, unknown>[] = [
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
];
