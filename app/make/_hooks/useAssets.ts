import { useMemo, useState, type ChangeEvent } from "react";
import { KINDS, kindOf, extOf, toPath, type Kind, type Asset } from "@/lib/mks";
import { storeAssets } from "../_lib/storage";
import { readAsDataUrl, withMime } from "../_lib/files";

type Params = {
  setNotice: (msg: string) => void;
  previewName: string | null; // 試し聞き中の音(名前を変える・消すときに止める)
  stopPreview: () => void;
};

// 画像と音(texture/ と sound/)の追加・名前変更・削除
export function useAssets({ setNotice, previewName, stopPreview }: Params) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editing, setEditing] = useState<string | null>(null); // 名前を変えている最中のファイル
  const [draft, setDraft] = useState("");

  const byKind = useMemo((): Record<Kind, Asset[]> => {
    const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));
    return {
      texture: sorted.filter((a) => kindOf(a.name) === "texture"),
      sound: sorted.filter((a) => kindOf(a.name) === "sound"),
    };
  }, [assets]);

  // 保存できたときだけ画面にも反映する(容量オーバーのとき用)
  const saveAssets = async (next: Asset[]): Promise<boolean> => {
    try {
      await storeAssets(next);
      setAssets(next);
      setNotice("");
      return true;
    } catch {
      setNotice("保存できなかったよ。ファイルが大きすぎるかも。小さいファイルでためしてね。");
      return false;
    }
  };

  const onAddFiles = (kind: Kind) => async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const usable =
      kind === "sound"
        ? files.filter((f) => f.type.startsWith("audio/") || KINDS.sound.ext.test(f.name))
        : files;
    if (usable.length === 0) {
      setNotice("使えないファイルだよ。音は mp3 / wav / ogg / m4a にしてね。");
      return;
    }

    const added = await Promise.all(
      usable.map(async (f) => {
        const name = toPath(f.name, kind);
        return { name, data: withMime(await readAsDataUrl(f), name) };
      })
    );
    const map = new Map(assets.map((a) => [a.name, a] as const));
    added.forEach((a) => a.name && map.set(a.name, a)); // 同じ名前は上書き
    await saveAssets([...map.values()]);
  };

  const startRename = (name: string) => {
    const kind = kindOf(name);
    if (!kind) return;
    setEditing(name);
    setDraft(name.slice(KINDS[kind].prefix.length));
  };

  const cancelRename = () => setEditing(null);

  const commitRename = async () => {
    if (editing === null) return;
    const from = editing;
    const kind = kindOf(from);
    setEditing(null);
    if (!kind) return;

    // 拡張子を書かなかったときは、元の拡張子のままにする
    const next = toPath(draft, kind, extOf(from));
    if (next && next !== from) {
      if (assets.some((a) => a.name === next)) {
        setNotice(`「${next}」はもうあるよ。ちがう名前にしてね。`);
      } else {
        if (previewName === from) stopPreview();
        await saveAssets(assets.map((a) => (a.name === from ? { ...a, name: next } : a)));
      }
    }
  };

  const removeAsset = (name: string) => {
    if (previewName === name) stopPreview();
    void saveAssets(assets.filter((a) => a.name !== name));
  };

  return {
    assets,
    setAssets,
    byKind,
    saveAssets,
    onAddFiles,
    editing,
    draft,
    setDraft,
    startRename,
    cancelRename,
    commitRename,
    removeAsset,
  };
}
