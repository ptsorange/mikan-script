import * as Blockly from "blockly";

/* ---------- ブロックの見た目(エディタに合わせる) ----------
   色は app/make/editor.css の変数・コードの色分け(.tk-*)と同じ。
   エディタは「暗い地に、色つきの文字・うすい色のかたまり」なので、
   ブロックも「暗い地に、うすく色をのせた面 + はっきりした色の枠」にする。 */

// editor.css の --panel / --ink / --panel-2 / --line / --text と同じ
const PANEL = "#252839";
const INK = "#1d1f2e";
const LINE = "#3a3f5a";
const TEXT = "#e8eaf6";

// コードの色分けと同じ色(.tk-ev / .tk-ct / .tk-lk / .tk-mt / .tk-st / .tk-nu)
const COLOR = {
  event: "#ffbf00", // スタートしたら・キーを押したら
  control: "#ffab19", // もし・ずっと・繰り返す・待つ
  looks: "#9966ff", // 表示
  func: "#59c0e0", // スクリーンサイズなど
  text: "#86d98b", // 文字
  num: "#7db6ff", // 数・計算
} as const;

// 面の色 = パネルの色に、メインの色を ratio だけまぜたもの
const mix = (color: string, ratio: number, base = PANEL) => {
  const c = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i: number) =>
    Math.round(c(base, i) + (c(color, i) - c(base, i)) * ratio)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(0)}${ch(1)}${ch(2)}`;
};

// primary: ブロックの面 / secondary: 中にはめた「あらかじめ入っている値」の面 / tertiary: 枠
const style = (color: string) => ({
  colourPrimary: mix(color, 0.22),
  colourSecondary: mix(color, 0.4),
  colourTertiary: color,
});

export const mikanTheme = Blockly.Theme.defineTheme("mikan", {
  name: "mikan",
  startHats: true, // 「スタートしたら」などの先頭のブロックに、帽子の形をつける
  blockStyles: {
    // このアプリ専用のブロック(lib/blocks.ts)
    mk_event: style(COLOR.event),
    mk_control: style(COLOR.control),
    mk_looks: style(COLOR.looks),
    mk_func: style(COLOR.func),
    mk_text: style(COLOR.text),
    mk_num: style(COLOR.num),
    // Blockly 標準のブロックが使うスタイル名
    logic_blocks: style(COLOR.control),
    loop_blocks: style(COLOR.control),
    math_blocks: style(COLOR.num),
    text_blocks: style(COLOR.text),
  },
  componentStyles: {
    workspaceBackgroundColour: INK,
    toolboxBackgroundColour: PANEL,
    toolboxForegroundColour: TEXT,
    flyoutBackgroundColour: PANEL,
    flyoutForegroundColour: TEXT,
    flyoutOpacity: 1,
    scrollbarColour: LINE,
    scrollbarOpacity: 0.9,
    insertionMarkerColour: "#ffffff",
    insertionMarkerOpacity: 0.25,
    markerColour: COLOR.event,
    cursorColour: COLOR.event,
  },
  // editor.css の --ui と同じ
  fontStyle: {
    family: 'system-ui, "Hiragino Maru Gothic ProN", "Yu Gothic UI", "Noto Sans JP", sans-serif',
    weight: "600",
    size: 11,
  },
});
