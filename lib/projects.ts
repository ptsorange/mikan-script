import JSZip from "jszip";
import { cacheLife } from "next/cache";
import {
  readConfig,
  findThumbnail,
  getProjectPublicUrl,
  PROJECTS_BUCKET_NAME,
  SUPABASE_URL,
} from "@/lib/mks";
import { createClient } from "@supabase/supabase-js";

export type ProjectInfo = {
  id: string;
  title: string;
  author: string;
  description: string;
  hasThumbnail: boolean;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_bW-hBshIFIxsHwHgu-q0LA_CDWq8Wkr"
);


const readInfo = async (fileName: string): Promise<ProjectInfo> => {
  const id = fileName.replace(/\.mks$/i, "");
  const info: ProjectInfo = { id, title: id, author: "", description: "", hasThumbnail: false };
  try {
    const res = await fetch(getProjectPublicUrl(fileName));
    if (!res.ok) throw new Error("Failed to fetch");
    const arrayBuffer = await res.arrayBuffer();

    const zip = await JSZip.loadAsync(arrayBuffer);
    const config = await readConfig(zip);
    info.title = config.title || id;
    info.author = config.author;
    info.description = config.description;
    info.hasThumbnail = findThumbnail(zip) !== null;
  } catch {
    /* 壊れたファイルでも、一覧には名前だけ出す */
  }
  return info;
};

export async function listProjects(): Promise<ProjectInfo[]> {
  "use cache";
  cacheLife("max"); // 作品はデプロイやストレージ更新のときにしか増えないのでキャッシュ

  let files: string[] = [];
  try {
    const { data, error } = await supabase.storage.from(PROJECTS_BUCKET_NAME).list();
    if (error) throw error;
    files = (data || []).map((f) => f.name).filter((f) => /\.mks$/i.test(f));
  } catch {
    /* 取得に失敗した場合は空 */
  }
  const list = await Promise.all(files.map(readInfo));
  return list.sort((a, b) => a.title.localeCompare(b.title, "ja"));
}

// サムネイル画像(なければ null)。id は listProjects にあるものだけ受けつける
export async function getThumbnail(id: string): Promise<{ type: string; base64: string } | null> {
  "use cache";
  cacheLife("max");

  const project = (await listProjects()).find((p) => p.id === id);
  if (!project || !project.hasThumbnail) return null;
  try {
    const res = await fetch(getProjectPublicUrl(`${project.id}.mks`));
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