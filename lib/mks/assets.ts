/* ---------- 画像・音・コードファイルの種類と、ファイル名の決まり ---------- */

export const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  code: "text/plain",
};

export type Kind = "texture" | "sound" | "code";
export type Asset = { name: string; data: string }; // name は "texture/cat.png" など、data は data URL

export const KINDS = {
  texture: { prefix: "texture/", ext: /\.(png|jpe?g|gif|webp)$/i, fallbackExt: "png" },
  sound: { prefix: "sound/", ext: /\.(mp3|wav|ogg|m4a)$/i, fallbackExt: "mp3" },
  // import で使うコードファイル。code/main.mjs(作品のメインのコード)とは別もの
  code: { prefix: "code/", ext: /\.code$/i, fallbackExt: "code" },
} as const;
export const KIND_LIST: Kind[] = ["texture", "sound", "code"];

export const kindOf = (name: string): Kind | null =>
  KIND_LIST.find((k) => name.startsWith(KINDS[k].prefix)) ?? null;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// "cat.png" や "texture/cat.png" を "texture/cat.png" にそろえる(sound・code も同じ)
export const toPath = (raw: string, kind: Kind, fallbackExt?: string) => {
  const k = KINDS[kind];
  let n = raw
    .trim()
    .replace(/^(texture|sound|code)\//, "")
    .replace(/[\/\\\s"'`]+/g, "_");
  if (!n) return "";
  if (!k.ext.test(n)) n += "." + (fallbackExt ?? k.fallbackExt);
  return k.prefix + n;
};
