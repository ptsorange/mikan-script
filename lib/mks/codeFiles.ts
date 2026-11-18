import { type ModuleSources } from "@/lib/lang";
import { type Asset, KINDS, MIME, kindOf } from "./assets";

/* ---------- コードファイル(code/*.code)の中身 ----------
   画像や音と同じ Asset(data URL)として持つ。エディタで読み書きするときだけ、文字に変える */

export const textToDataUrl = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return `data:${MIME.code};base64,${btoa(bin)}`;
};

export const dataUrlToText = (data: string): string => {
  const i = data.indexOf(",");
  if (i === -1) return "";
  const body = data.slice(i + 1);
  try {
    if (/;base64/i.test(data.slice(0, i))) {
      const bin = atob(body);
      return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    }
    return decodeURIComponent(body);
  } catch {
    return "";
  }
};

export const isCodeAsset = (a: Asset) => kindOf(a.name) === "code" && KINDS.code.ext.test(a.name);

// code/xxx.code の中身を、import で使える形(名前 → ソース)にする
export const toModuleSources = (assets: Asset[]): ModuleSources =>
  Object.fromEntries(assets.filter(isCodeAsset).map((a) => [a.name, dataUrlToText(a.data)]));
