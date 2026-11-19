import JSZip from "jszip";
import type { Locale } from "@/lib/i18n";
import { getProjectPublicUrl } from "./supabase";
import { type Asset, KINDS, MIME, extOf, kindOf, toPath } from "./assets";
import { CONFIG_NAME, type Meta, THUMBNAIL_NAME, findThumbnail, hasConfigMeta, readConfig, serializeMeta } from "./meta";

/* .mks ファイル(zip)まわりの、エディタと「あそぶ」ページで共通の処理。
   中身:  code/main.mjs ・ code/*.code(import で使うコードファイル) ・ texture/* ・ sound/*
          ・ config.json(あれば) ・ thumbnail.png(あれば)
   config.json と thumbnail.png は zip の一番上(ルート)に置く */

/* ---------- 書き出し・読み込み ---------- */

export const buildMks = async (
  code: string,
  assets: Asset[],
  meta: Meta,
  thumbnail: string | null
): Promise<Blob> => {
  const zip = new JSZip();
  zip.file("code/main.mjs", code);
  if (hasConfigMeta(meta)) {
    zip.file(CONFIG_NAME, JSON.stringify(serializeMeta(meta), null, 2));
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
  input: Blob | ArrayBuffer | Uint8Array,
  locale: Locale = "ja"
): Promise<{ code: string; assets: Asset[]; meta: Meta; thumbnail: string | null }> => {
  const zip = await JSZip.loadAsync(input);

  const codeFile = zip.file("code/main.mjs");
  if (!codeFile) {
    throw new Error(locale === "en" ? "code/main.mjs not found" : "code/main.mjs が見つかりません");
  }
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
export const fetchProject = async (id: string, version?: string, locale: Locale = "ja") => {
  // 一覧の id は通常拡張子なし。拡張子付きで渡されても二重に付けない。
  const fileName = /\.mks$/i.test(id) ? id : `${id}.mks`;
  const res = await fetch(getProjectPublicUrl(fileName, version));
  if (!res.ok) {
    throw new Error(locale === "en" ? `Failed to load project (${res.status})` : `作品の取得に失敗しました (${res.status})`);
  }
  return parseMks(await res.arrayBuffer(), locale);
};
