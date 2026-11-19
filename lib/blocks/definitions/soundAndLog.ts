import type { Locale } from "@/lib/i18n";

/* ブロックの定義: サウンドとログ */

export const getSoundAndLogBlocks = (locale: Locale): Record<string, unknown>[] => {
  const en = locale === "en";
  return [
    {
      type: "mk_play_sound",
      message0: en ? "play sound %1 volume %2" : "音 %1 を音量 %2 で鳴らす",
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
      message0: en ? "stop sound %1" : "音 %1 を止める",
      args0: [{ type: "field_input", name: "NAME", text: "jump.mp3" }],
      previousStatement: null,
      nextStatement: null,
      style: "mk_func",
    },
    {
      type: "mk_clear_log",
      message0: en ? "clear log" : "ログをクリア",
      previousStatement: null,
      nextStatement: null,
      style: "mk_looks",
    },
  ];
};
