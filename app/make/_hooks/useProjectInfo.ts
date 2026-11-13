import { useState, type ChangeEvent } from "react";
import { toThumbnail, EMPTY_META, type Meta } from "@/lib/mks";
import { META_KEY, THUMB_KEY } from "../_lib/storage";
import { readAsDataUrl } from "../_lib/files";

type Params = {
  setNotice: (msg: string) => void;
  /** いま実行画面に出ている絵を取る(取れなければ null) */
  capture: () => Promise<string | null> | undefined;
};

// 作品の情報: タイトル・作者・説明・サムネ
export function useProjectInfo({ setNotice, capture }: Params) {
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  const onMetaChange = (key: keyof Meta, value: string) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    localStorage.setItem(META_KEY, JSON.stringify(next));
  };

  // サムネイルは localStorage に入れる(小さくしてあるので入る。入らなかったら画面だけ)
  const saveThumbnail = (data: string | null) => {
    setThumbnail(data);
    try {
      if (data) localStorage.setItem(THUMB_KEY, data);
      else localStorage.removeItem(THUMB_KEY);
    } catch {
      setNotice("サムネイルを保存できませんでした。書き出しが終わるまで、このページを開いたままにしてください。");
    }
  };

  const onPickThumbnail = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      saveThumbnail(await toThumbnail(await readAsDataUrl(file)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "サムネイルを設定できませんでした。");
    }
  };

  // いま実行画面に出ている絵を、そのままサムネにする
  const captureThumbnail = async () => {
    try {
      const shot = await capture();
      if (!shot) return;
      saveThumbnail(await toThumbnail(shot));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "サムネイルを設定できませんでした。");
    }
  };

  return { meta, setMeta, thumbnail, setThumbnail, onMetaChange, saveThumbnail, onPickThumbnail, captureThumbnail };
}
