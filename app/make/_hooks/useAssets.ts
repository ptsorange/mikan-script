import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { KINDS, kindOf, extOf, toPath, textToDataUrl, type Kind, type Asset } from "@/lib/mks";
import { storeAssets } from "../_lib/storage";
import { readAsDataUrl, withMime } from "../_lib/files";

type Params = {
  setNotice: (msg: string) => void;
  previewName: string | null; // 試し聞き中の音(名前を変える・消すときに止める)
  stopPreview: () => void;
  onRenamed?: (from: string, to: string) => void; // コードファイルの名前が変わったとき(開いているタブ用)
};

// 新しく作ったコードファイルに最初から入れておく中身
const NEW_CODE_TEMPLATE = `// コードファイル。ここに書いた function / num / text / sprite は、
// ほかのコードから import して使えるよ。
//   import 名前 "/code/このファイルの名前.code"
//   名前.hello()

function hello() {
  println("hello")
}
`;

// 画像・音・コードファイル(texture/ sound/ code/)の追加・作成・名前変更・削除
export function useAssets({ setNotice, previewName, stopPreview, onRenamed }: Params) {
  const [assets, setAssets] = useState<Asset[]>([]);
  // 最新の assets(文字を打つたびに保存し直さないよう、少し待ってからまとめて保存するときに使う)
  const assetsRef = useRef<Asset[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);
  const [editing, setEditing] = useState<string | null>(null); // 名前を変えている最中のファイル
  const [draft, setDraft] = useState("");

  const byKind = useMemo((): Record<Kind, Asset[]> => {
    const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));
    return {
      texture: sorted.filter((a) => kindOf(a.name) === "texture"),
      sound: sorted.filter((a) => kindOf(a.name) === "sound"),
      code: sorted.filter((a) => kindOf(a.name) === "code"),
    };
  }, [assets]);

  const cancelPendingSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
  };

  // 待っていた保存を、いますぐ実行する
  const flushSave = () => {
    if (!saveTimer.current) return;
    cancelPendingSave();
    storeAssets(assetsRef.current).catch(() => {
      setNotice("保存できなかったよ。ファイルが大きすぎるかも。小さいファイルでためしてね。");
    });
  };

  // ページを閉じる・切りかえるときに、書きかけを保存する
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存できたときだけ画面にも反映する(容量オーバーのとき用)
  const saveAssets = async (next: Asset[]): Promise<boolean> => {
    cancelPendingSave(); // 待っていた保存は、これでいらなくなる
    try {
      await storeAssets(next);
      assetsRef.current = next;
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

    // コードファイルは、中身を文字として読む(.txt や .js も、.code として取りこむ)
    const isCodeFile = (f: File) => /\.(code|txt|js|mjs)$/i.test(f.name);
    const usable =
      kind === "sound"
        ? files.filter((f) => f.type.startsWith("audio/") || KINDS.sound.ext.test(f.name))
        : kind === "code"
          ? files.filter(isCodeFile)
          : files;
    if (usable.length === 0) {
      setNotice(
        kind === "code"
          ? "使えないファイルだよ。コードは .code(または .txt / .js)にしてね。"
          : "使えないファイルだよ。音は mp3 / wav / ogg / m4a にしてね。"
      );
      return;
    }

    const added = await Promise.all(
      usable.map(async (f) => {
        if (kind === "code") {
          const name = toPath(f.name.replace(/\.(txt|js|mjs)$/i, ""), "code");
          return { name, data: textToDataUrl(await f.text()) };
        }
        const name = toPath(f.name, kind);
        return { name, data: withMime(await readAsDataUrl(f), name) };
      })
    );
    const map = new Map(assets.map((a) => [a.name, a] as const));
    added.forEach((a) => a.name && map.set(a.name, a)); // 同じ名前は上書き
    await saveAssets([...map.values()]);
  };

  // あたらしいコードファイルを作る(名前は new_code.code、あったら new_code_2.code …)
  const createCode = async (): Promise<string | null> => {
    const taken = new Set(assetsRef.current.map((a) => a.name));
    let name = "code/new_code.code";
    for (let n = 2; taken.has(name); n++) name = `code/new_code_${n}.code`;
    const ok = await saveAssets([...assetsRef.current, { name, data: textToDataUrl(NEW_CODE_TEMPLATE) }]);
    return ok ? name : null;
  };

  // エディタで書きかえた中身を反映する。画面にはすぐ、保存は少し待ってから(1 文字ごとに保存し直さない)
  const updateText = (name: string, text: string) => {
    const next = assetsRef.current.map((a) => (a.name === name ? { ...a, data: textToDataUrl(text) } : a));
    assetsRef.current = next;
    setAssets(next);
    cancelPendingSave();
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      storeAssets(assetsRef.current).catch(() => {
        setNotice("保存できなかったよ。ファイルが大きすぎるかも。小さいファイルでためしてね。");
      });
    }, 400);
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
        if (await saveAssets(assets.map((a) => (a.name === from ? { ...a, name: next } : a)))) {
          onRenamed?.(from, next);
        }
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
    createCode,
    updateText,
    editing,
    draft,
    setDraft,
    startRename,
    cancelRename,
    commitRename,
    removeAsset,
  };
}
