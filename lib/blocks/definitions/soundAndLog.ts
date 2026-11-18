/* ブロックの定義: サウンドとログ */

export const SOUND_AND_LOG_BLOCKS: Record<string, unknown>[] = [
  {
    type: "mk_play_sound",
    message0: "音 %1 を音量 %2 で鳴らす",
    args0: [
      { type: "field_input", name: "NAME", text: "jump.mp3" },
      { type: "input_value", name: "VOLUME" },
    ],
    previousStatement: null,
    nextStatement: null,
    style: "mk_func",
  },
  {
    type: "mk_stop_sound",
    message0: "音 %1 を止める",
    args0: [{ type: "field_input", name: "NAME", text: "jump.mp3" }],
    previousStatement: null,
    nextStatement: null,
    style: "mk_func",
  },
  {
    type: "mk_clear_log",
    message0: "ログをクリア",
    previousStatement: null,
    nextStatement: null,
    style: "mk_looks",
  },
];
