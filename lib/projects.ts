import JSZip from "jszip";
import { cacheLife, cacheTag } from "next/cache";
import {
  readConfig,
  findThumbnail,
  getProjectPublicUrl,
  PROJECTS_BUCKET_NAME,
  SUPABASE_URL,
} from "@/lib/mks";
import type { TouchControlsConfig } from "@/lib/touchControls";
import { createClient } from "@supabase/supabase-js";

export type ProjectInfo = {
  id: string;
  title: string;
  author: string;
  description: string;
  hasThumbnail: boolean;
  version: string; // Storage 上の更新日時(キャッシュ回避用)
  touchControls?: TouchControlsConfig;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_bW-hBshIFIxsHwHgu-q0LA_CDWq8Wkr"
);


const readInfo = async (fileName: string, version: string): Promise<ProjectInfo> => {
  const id = fileName.replace(/\.mks$/i, "");
  const info: ProjectInfo = { id, title: id, author: "", description: "", hasThumbnail: false, version };
  try {
    const res = await fetch(getProjectPublicUrl(fileName, version));
    if (!res.ok) throw new Error("Failed to fetch");
    const arrayBuffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const config = await readConfig(zip);
    info.title = config.title || id;
    info.author = config.author;
    info.description = config.description;
    info.hasThumbnail = findThumbnail(zip) !== null;
    if (config.touchControls) info.touchControls = config.touchControls;
  } catch {
    /* 壊れたファイルでも、一覧には名前だけ出す */
  }
  return info;
};

export async function listProjects(): Promise<ProjectInfo[]> {
  "use cache";
  // ストレージは再デプロイなしで書き換えるので、永久には持たず数分で取り直す。
  // すぐ反映したいときは /api/revalidate で "projects" タグを無効化する
  cacheLife("minutes");
  cacheTag("projects");

  let files: { name: string; version: string }[] = [];
  try {
    const { data, error } = await supabase.storage.from(PROJECTS_BUCKET_NAME).list();
    if (error) throw error;
    files = (data || [])
      .filter((f) => /\.mks$/i.test(f.name))
      .map((f) => ({ name: f.name, version: f.updated_at ?? f.created_at ?? "" }));
  } catch {
    /* 取得に失敗した場合は空 */
  }
  const list = await Promise.all(files.map((f) => readInfo(f.name, f.version)));
  return list.sort((a, b) => a.title.localeCompare(b.title, "ja"));
}

// サムネイル画像(なければ null)。id は listProjects にあるものだけ受けつける
export async function getThumbnail(id: string): Promise<{ type: string; base64: string } | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("projects");

  const project = (await listProjects()).find((p) => p.id === id);
  if (!project || !project.hasThumbnail) return null;
  try {
    const res = await fetch(getProjectPublicUrl(`${project.id}.mks`, project.version));
    if (!res.ok) throw new Error("Failed to fetch");
    const arrayBuffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const thumb = findThumbnail(zip);
    if (!thumb) return null;
    return { type: thumb.mime, base64: await thumb.file.async("base64") };
  } catch {
    return null;
  }
}