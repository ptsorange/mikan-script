import type JSZip from "jszip";
import type { Locale } from "@/lib/i18n";
import { hasTouchControlsConfig, sanitizeTouchControls, type TouchControlsConfig } from "@/lib/touchControls";
import { MIME, extOf } from "./assets";

/* ---------- 作品の情報(config.json)とサムネイル(thumbnail.png) ---------- */

export type Meta = {
  title: string;
  author: string;
  description: string;
  touchControls?: TouchControlsConfig;
};
export const EMPTY_META: Meta = { title: "", author: "", description: "" };

export const CONFIG_NAME = "config.json";
const LEGACY_CONFIG_NAMES = ["meta.json"]; // 古い名前(あれば読む)
export const THUMBNAIL_NAME = "thumbnail.png";
// 書き出しは thumbnail.png。手で zip に入れるときは、これらの名前でも読める
const THUMBNAIL_NAMES = [
  THUMBNAIL_NAME,
  "thumbnail.jpg",
  "thumbnail.jpeg",
  "thumbnail.webp",
  "sumnail.png",
];

// どんな JSON が来ても、安全な文字列だけの Meta にする
export const toMeta = (raw: unknown): Meta => {
  const r = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const touchControls = sanitizeTouchControls(r.touchControls);
  return {
    title: s(r.title, 60),
    author: s(r.author, 40),
    description: s(r.description, 200),
    ...(touchControls ? { touchControls } : {}),
  };
};

export const hasConfigMeta = (meta: Meta): boolean =>
  Boolean(meta.title || meta.author || meta.description || hasTouchControlsConfig(meta.touchControls));

export const serializeMeta = (meta: Meta): Meta => {
  const touchControls = sanitizeTouchControls(meta.touchControls);
  return {
    title: meta.title,
    author: meta.author,
    description: meta.description,
    ...(touchControls ? { touchControls } : {}),
  };
};

// zip の一番上にある config.json を読む(なければ空、こわれていても空)
export const readConfig = async (zip: JSZip): Promise<Meta> => {
  const file = [CONFIG_NAME, ...LEGACY_CONFIG_NAMES].map((n) => zip.file(n)).find(Boolean);
  if (!file) return EMPTY_META;
  try {
    return toMeta(JSON.parse(await file.async("string")));
  } catch {
    return EMPTY_META;
  }
};

// zip の一番上にあるサムネイルを探す
export const findThumbnail = (zip: JSZip): { file: JSZip.JSZipObject; mime: string } | null => {
  for (const name of THUMBNAIL_NAMES) {
    const file = zip.file(name);
    const mime = MIME[extOf(name)];
    if (file && mime) return { file, mime };
  }
  return null;
};

// 画像(data URL)を、サムネ用に小さくして PNG にする。透明なところは背景色でうめる
export const toThumbnail = (src: string, maxWidth = 480, locale: Locale = "ja"): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / (img.naturalWidth || 1));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error(locale === "en" ? "Could not create image" : "画像を作成できませんでした"));
      ctx.fillStyle = "#1d1f2e";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error(locale === "en" ? "Could not load image" : "画像を読み込めませんでした"));
    img.src = src;
  });
