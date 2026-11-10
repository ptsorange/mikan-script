import JSZip from "jszip";
import { splitCode, compile, RUNTIME } from "@/lib/lang";

/* .mks ファイル(zip)まわりの、エディタと「あそぶ」ページで共通の処理。
   中身:  code/main.mjs ・ texture/* ・ sound/* ・ meta.json(あれば) */

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

/* ---------- 作品の情報(meta.json) ---------- */

export type Meta = { title: string; author: string; description: string };
export const EMPTY_META: Meta = { title: "", author: "", description: "" };

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

/* ---------- 書き出し・読み込み ---------- */

export const buildMks = async (code: string, assets: Asset[], meta: Meta): Promise<Blob> => {
  const zip = new JSZip();
  zip.file("code/main.mjs", code);
  if (meta.title || meta.author || meta.description) {
    zip.file("meta.json", JSON.stringify(meta, null, 2));
  }
  assets.forEach((a) => {
    zip.file(a.name, a.data.slice(a.data.indexOf(",") + 1), { base64: true });
  });
  return zip.generateAsync({ type: "blob" });
};

export const parseMks = async (
  input: Blob | ArrayBuffer | Uint8Array
): Promise<{ code: string; assets: Asset[]; meta: Meta }> => {
  const zip = await JSZip.loadAsync(input);

  const codeFile = zip.file("code/main.mjs");
  if (!codeFile) throw new Error("code/main.mjs が見つからないよ");
  const code = await codeFile.async("string");

  let meta = EMPTY_META;
  const metaFile = zip.file("meta.json");
  if (metaFile) {
    try {
      meta = toMeta(JSON.parse(await metaFile.async("string")));
    } catch {
      /* 壊れた meta.json は無視する */
    }
  }

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
  return { code, assets, meta };
};

// public/projects/ の作品を取ってきて読み込む
export const fetchProject = async (id: string) => {
  const res = await fetch(`/projects/${encodeURIComponent(id)}.mks`);
  if (!res.ok) throw new Error("作品が見つからないよ");
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
export const buildScript = (code: string) => `return (async () => {
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
const log = document.getElementById("logBox");
log.textContent = "";
const addLog = (t) => { log.textContent += t; };
const addLogLn = (t) => { log.textContent += t+"\\n";};
const clearLog = () => { log.textContent = ""; };
const setScreenSize = (w, h) => {
  canvas.width = w;
  canvas.height = h;
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
