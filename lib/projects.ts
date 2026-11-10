import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { cacheLife } from "next/cache";
import { readConfig, findThumbnail } from "@/lib/mks";

/* public/projects/ に置いた .mks を、ホームの一覧にする(サーバー側の処理)。
   ファイルを足してデプロイするだけで、自動で並ぶ。
   各 .mks の一番上にある config.json(タイトル・説明・作者)と thumbnail.png を読む。 */

export type ProjectInfo = {
  id: string; // ファイル名から ".mks" を取ったもの
  title: string; // config.json の title(なければ id)
  author: string;
  description: string;
  hasThumbnail: boolean; // true なら /thumbnails/<id> で画像が取れる
};

const DIR = path.join(process.cwd(), "public", "projects");

const readInfo = async (file: string): Promise<ProjectInfo> => {
  const id = file.replace(/\.mks$/i, "");
  const info: ProjectInfo = { id, title: id, author: "", description: "", hasThumbnail: false };
  try {
    const zip = await JSZip.loadAsync(await fs.readFile(path.join(DIR, file)));
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
  cacheLife("max"); // 作品はデプロイのときにしか増えないので、ずっと使いまわす

  let files: string[] = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => /\.mks$/i.test(f));
  } catch {
    /* フォルダがなければ空 */
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
    const zip = await JSZip.loadAsync(await fs.readFile(path.join(DIR, `${project.id}.mks`)));
    const thumb = findThumbnail(zip);
    if (!thumb) return null;
    return { type: thumb.mime, base64: await thumb.file.async("base64") };
  } catch {
    return null;
  }
}
