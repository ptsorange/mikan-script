/* プレビューの画面比率の選択肢と、保存するときの名前 */

export const ASPECT_OPTIONS = [
  { id: "4 / 3", label: "4:3 (標準 400×300)" },
  { id: "3 / 2", label: "3:2 (600×400)" },
  { id: "16 / 9", label: "16:9 (ワイド)" },
  { id: "1 / 1", label: "1:1 (正方形)" },
  { id: "9 / 16", label: "9:16 (縦長)" },
] as const;

export const ASPECT_STORAGE_KEY = "kc-touch-preview-aspect-v1";
