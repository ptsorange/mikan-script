import JSZip from "jszip";
import { splitCode, compile, RUNTIME, type ModuleSources } from "@/lib/lang";

// 公開プロジェクトを保存している Supabase Storage
export const PROJECTS_BUCKET_NAME = "mikanScriptProjects";
export const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ihvbsisbjlhhqwghxhvp.supabase.co"
).replace(/\/+$/, "");

// version には Storage の updated_at を渡す。同じファイル名で上書きしても
// URL が変わるので、Supabase の CDN やブラウザの古いキャッシュを見なくなる
export const getProjectPublicUrl = (fileName: string, version?: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${PROJECTS_BUCKET_NAME}/${encodeURIComponent(fileName)}${
    version ? `?v=${encodeURIComponent(version)}` : ""
  }`;

/* .mks ファイル(zip)まわりの、エディタと「あそぶ」ページで共通の処理。
   中身:  code/main.mjs ・ code/*.code(import で使うコードファイル) ・ texture/* ・ sound/*
          ・ config.json(あれば) ・ thumbnail.png(あれば)
   config.json と thumbnail.png は zip の一番上(ルート)に置く */

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

/* ---------- 作品の情報(config.json)とサムネイル(thumbnail.png) ---------- */

export type Meta = { title: string; author: string; description: string };
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
  return {
    title: s(r.title, 60),
    author: s(r.author, 40),
    description: s(r.description, 200),
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
export const toThumbnail = (src: string, maxWidth = 480): Promise<string> =>
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
      if (!ctx) return reject(new Error("画像を作成できませんでした"));
      ctx.fillStyle = "#1d1f2e";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = src;
  });

/* ---------- 書き出し・読み込み ---------- */

export const buildMks = async (
  code: string,
  assets: Asset[],
  meta: Meta,
  thumbnail: string | null
): Promise<Blob> => {
  const zip = new JSZip();
  zip.file("code/main.mjs", code);
  if (meta.title || meta.author || meta.description) {
    zip.file(CONFIG_NAME, JSON.stringify(meta, null, 2));
  }
  if (thumbnail) {
    zip.file(THUMBNAIL_NAME, thumbnail.slice(thumbnail.indexOf(",") + 1), { base64: true });
  }
  assets.forEach((a) => {
    zip.file(a.name, a.data.slice(a.data.indexOf(",") + 1), { base64: true });
  });
  return zip.generateAsync({ type: "blob" });
};

export const parseMks = async (
  input: Blob | ArrayBuffer | Uint8Array
): Promise<{ code: string; assets: Asset[]; meta: Meta; thumbnail: string | null }> => {
  const zip = await JSZip.loadAsync(input);

  const codeFile = zip.file("code/main.mjs");
  if (!codeFile) throw new Error("code/main.mjs が見つかりません");
  const code = await codeFile.async("string");

  const meta = await readConfig(zip);

  let thumbnail: string | null = null;
  const thumb = findThumbnail(zip);
  if (thumb) thumbnail = `data:${thumb.mime};base64,${await thumb.file.async("base64")}`;

  const assets: Asset[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const kind = kindOf(entry.name);
    if (!kind || !KINDS[kind].ext.test(entry.name)) continue;
    const mime = MIME[extOf(entry.name)];
    if (!mime) continue;
    const base64 = await entry.async("base64");
    const name = toPath(entry.name, kind);
    if (name) assets.push({ name, data: `data:${mime};base64,${base64}` });
  }
  return { code, assets, meta, thumbnail };
};

// Supabase Storage から作品を取ってきて読み込む
export const fetchProject = async (id: string, version?: string) => {
  // 一覧の id は通常拡張子なし。拡張子付きで渡されても二重に付けない。
  const fileName = /\.mks$/i.test(id) ? id : `${id}.mks`;
  const res = await fetch(getProjectPublicUrl(fileName, version));
  if (!res.ok) {
    throw new Error(`作品の取得に失敗しました (${res.status})`);
  }
  return parseMks(await res.arrayBuffer());
};

/* ---------- 実行 ---------- */

/* 作品のコードは、本体ページでは動かさない。
   ここで作るのは「iframe の中で動かす JS の文字列」だけ(動かすのは lib/sandbox.ts の iframe)。
   iframe の中には id="gameScreen"(canvas) があり、ログや大きさの変更は
   window.__ms を通して親に postMessage で伝える。 */
export const buildScript = (code: string, volume: number, assets: Asset[] = []) => {
  const v = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 100;
  return `(async () => {
const scriptVolume = ${v};
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // 拡大・縮小しても、ピクセルをぼかさない
const addLog = (t) => { window.__ms.post({ type: "log", text: String(t) }); };
const addLogLn = (t) => { window.__ms.post({ type: "log", text: String(t) + "\\n" }); };
const clearLog = () => { window.__ms.post({ type: "clear" }); };
const setScreenSize = (w, h) => {
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false; // canvas の大きさを変えると設定が戻るので、もう一度指定する
  window.__ms.resize(); // iframe の拡大率と、親に伝える大きさを更新する
  draw();
};
const __getTexture = (name) => {
  const img = window.__textures[name];
  if (!img) addLog("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n");
  return img;
};
const __getSound = (name) => {
  const url = window.__soundUrls[name];
  if (!url) addLog("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n");
  return url;
};
${RUNTIME}

window.setGlobalVolume = setGlobalVolume; // 親からの音量変更(postMessage)で使う
setGlobalVolume(scriptVolume / 100);

${compile(splitCode(code), [], toModuleSources(assets))}
})().catch((e) => {
  if (e?.message !== "stopped") window.__ms.post({ type: "log", text: "エラー: " + (e?.message ?? e) + "\\n" });
});`;
};
