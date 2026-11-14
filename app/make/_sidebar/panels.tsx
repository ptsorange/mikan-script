import type { ReactNode } from "react";

/* 左端の縦バーに並ぶパネルの一覧(新しいパネルを足すときは、ここと page.tsx の表示部分に足す) */

// 左端の縦バー(VS Code のアクティビティバー)で切りかえるパネル
export type Panel = "explorer" | "block" | "info" | "texture" | "sound";

export const PANELS: { id: Panel; label: string }[] = [
  { id: "explorer", label: "エクスプローラー(書き出しの中身)" },
  { id: "block", label: "ブロックでコードを作る" },
  { id: "info", label: "作品の情報(タイトル・説明・サムネ)" },
  { id: "texture", label: "テクスチャ" },
  { id: "sound", label: "サウンド" },
];

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const ICONS: Record<Panel, ReactNode> = {
  explorer: (
    <svg {...svgProps}>
      <path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v12A1.5 1.5 0 0 0 7.5 18h9a1.5 1.5 0 0 0 1.5-1.5V7l-4-4z" />
      <path d="M14 3v4.5a.5.5 0 0 0 .5.5H18" />
      <path d="M9 21h8.5a2.5 2.5 0 0 0 2.5-2.5V10" />
    </svg>
  ),
  block: (
    <svg {...svgProps}>
      <path d="M5 3.5H6.5L7.5 4.5H10.5L11.5 3.5H19a1.5 1.5 0 0 1 1.5 1.5V8a1.5 1.5 0 0 1-1.5 1.5H11.5L10.5 10.5H7.5L6.5 9.5H5A1.5 1.5 0 0 1 3.5 8V5A1.5 1.5 0 0 1 5 3.5z" />
      <path d="M5 13.5H6.5L7.5 14.5H10.5L11.5 13.5H19a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H11.5L10.5 20.5H7.5L6.5 19.5H5A1.5 1.5 0 0 1 3.5 18V15A1.5 1.5 0 0 1 5 13.5z" />
    </svg>
  ),
  info: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  ),
  texture: (
    <svg {...svgProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 17l5-4.5 3.5 3L15.5 13l4.5 4" />
    </svg>
  ),
  sound: (
    <svg {...svgProps}>
      <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18 6.5a8 8 0 0 1 0 11" />
    </svg>
  ),
};
