import type { Asset } from "@/lib/mks";

// data URL の中身(base64)が、ファイルとして何バイトか
export const assetBytes = (a: Asset) =>
  Math.round(((a.data.length - a.data.indexOf(",") - 1) * 3) / 4);

export const fmtSize = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;
