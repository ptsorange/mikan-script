import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { cacheLife } from "next/cache";
import { toMeta } from "@/lib/mks";

/* public/projects/ に置いた .mks を、ホームの一覧にする(サーバー側の処理)。
   ファイルを足してデプロイするだけで、自動で並ぶ。 */

export type ProjectInfo = {
  id: string; // ファイル名から ".mks" を取ったもの
  title: string; // meta.json の title(なければ id)
  author: string;
  description: string;
};

const DIR = path.join(process.cwd(), "public", "projects");

const readInfo = async (file: string): Promise<ProjectInfo> => {
  const id = file.replace(/\.mks$/i, "");
  const info: ProjectInfo = { id, title: id, author: "", description: "" };
  try {
    const zip = await JSZip.loadAsync(await fs.readFile(path.join(DIR, file)));
    const metaFile = zip.file("meta.json");
    if (metaFile) {
      const m = toMeta(JSON.parse(await metaFile.async("string")));
      info.title = m.title || id;
      info.author = m.author;
      info.description = m.description;
    }
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
