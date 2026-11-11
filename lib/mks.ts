import JSZip from "jszip";
import { splitCode, compile, RUNTIME } from "@/lib/lang";

/* .mks ファイル(zip)まわりの、エディタと「あそぶ」ページで共通の処理。
   中身:  code/main.mjs ・ texture/* ・ sound/* ・ config.json(あれば) ・ thumbnail.png(あれば)
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
};

export type Kind = "texture" | "sound";
export type Asset = { name: string; data: string }; // name は "texture/cat.png" など、data は data URL

export const KINDS = {
  texture: { prefix: "texture/", ext: /\.(png|jpe?g|gif|webp)$/i, fallbackExt: "png" },
  sound: { prefix: "sound/", ext: /\.(mp3|wav|ogg|m4a)$/i, fallbackExt: "mp3" },
} as const;
export const KIND_LIST: Kind[] = ["texture", "sound"];

export const kindOf = (name: string): Kind | null =>
  name.startsWith(KINDS.texture.prefix)
    ? "texture"
    : name.startsWith(KINDS.sound.prefix)
      ? "sound"
      : null;

export const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// "cat.png" や "texture/cat.png" を "texture/cat.png" にそろえる(sound も同じ)
export const toPath = (raw: string, kind: Kind, fallbackExt?: string) => {
  const k = KINDS[kind];
  let n = raw
    .trim()
    .replace(/^(texture|sound)\//, "")
    .replace(/[\/\\\s"'`]+/g, "_");
  if (!n) return "";
  if (!k.ext.test(n)) n += "." + (fallbackExt ?? k.fallbackExt);
  return k.prefix + n;
};

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

// public/projects/ の作品を取ってきて読み込む
export const fetchProject = async (id: string) => {
  const res = await fetch(`/projects/${encodeURIComponent(id)}.mks`);
  if (!res.ok) throw new Error("作品が見つかりません");
  return parseMks(await res.arrayBuffer());
};

/* ---------- 実行 ---------- */

export type Prepared = {
  textureMap: Record<string, HTMLImageElement>;
  soundMap: Record<string, string>;
  soundUrls: string[]; // 使い終わったら URL.revokeObjectURL する
};

// 画像と音をぜんぶ読み込んでおく
export const prepareAssets = async (assets: Asset[]): Promise<Prepared> => {
  const textureMap: Prepared["textureMap"] = {};
  const soundMap: Prepared["soundMap"] = {};
  const soundUrls: string[] = [];
  await Promise.all(
    assets.map(async (a) => {
      if (kindOf(a.name) === "texture") {
        const img = new Image();
        img.src = a.data;
        try {
          await img.decode();
        } catch {
          /* 読み込めない画像は描かれないだけ */
        }
        textureMap[a.name] = img;
      } else {
        try {
          // 大きな data URL をそのまま使うより、Blob の URL のほうが軽い
          const blob = await (await fetch(a.data)).blob();
          const url = URL.createObjectURL(blob);
          soundUrls.push(url);
          soundMap[a.name] = url;
        } catch {
          /* 読み込めない音は鳴らないだけ */
        }
      }
    })
  );
  return { textureMap, soundMap, soundUrls };
};

// ページの中に id="gameScreen"(canvas) と id="logBox" がある前提で動く
export const buildScript = (code: string, volume: number) => `return (async () => {
const scriptVolume = ${volume};
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // 拡大・縮小しても、ピクセルをぼかさない
const log = document.getElementById("logBox");
log.textContent = "";
const addLog = (t) => { log.textContent += t; };
const addLogLn = (t) => { log.textContent += t+"\\n";};
const clearLog = () => { log.textContent = ""; };
const setScreenSize = (w, h) => {
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false; // canvas の大きさを変えると設定が戻るので、もう一度指定する
  draw();
};
const __getTexture = (name) => {
  const img = __textures[name];
  if (!img) addLog("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n");
  return img;
};
const __getSound = (name) => {
  const url = __soundUrls[name];
  if (!url) addLog("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n");
  return url;
};
${RUNTIME}

// ★ ここで window にグローバル音量変更関数を登録する
window.setGlobalVolume = setGlobalVolume;

// RUNTIME が読み込まれたあとに初期音量を反映
if (typeof setGlobalVolume === "function") {
  setGlobalVolume(${volume} / 100);
}

${compile(splitCode(code), [])}
})();`;

export const runScript = (js: string, p: Prepared) =>
  new Function("__textures", "__soundUrls", js)(p.textureMap, p.soundMap) as Promise<void>;

// 止めると、鳴っている音も止まる(RUNTIME の cleanup が止める)
export const stopScript = () => {
  const w = window as unknown as { __runId?: number; __cleanups?: (() => void)[] };
  w.__runId = (w.__runId ?? 0) + 1;
  (w.__cleanups ?? []).forEach((f) => f());
  w.__cleanups = [];
};
