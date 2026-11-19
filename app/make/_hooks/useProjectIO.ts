import { useEffect, type ChangeEvent } from "react";
import { buildMks, parseMks, fetchProject, toMeta, type Asset, type Meta } from "@/lib/mks";
import { LOCALE_STORAGE_KEY, MESSAGES, isLocale, type Locale } from "@/lib/i18n";
import { useLocale } from "@/app/_components/LocaleProvider";
import {
  CODE_KEY,
  META_KEY,
  THUMB_KEY,
  LEGACY_TEXTURE_KEY,
  loadAssets,
  storeAssets,
  isAsset,
} from "../_lib/storage";
import { getSampleCode, isSampleCode } from "../_lib/sample";

type Params = {
  inputCode: string;
  setInputCode: (code: string) => void;
  updateCode: (code: string) => void;
  assets: Asset[];
  setAssets: (assets: Asset[]) => void;
  saveAssets: (assets: Asset[]) => Promise<boolean>;
  meta: Meta;
  setMeta: (meta: Meta) => void;
  thumbnail: string | null;
  setThumbnail: (data: string | null) => void;
  saveThumbnail: (data: string | null) => void;
  stopPreview: () => void;
  setNotice: (msg: string) => void;
};

// 起動時の読み込み(localStorage / IndexedDB / ?load=作品名)と、.mks の書き出し・読み込み
export function useProjectIO(p: Params) {
  const { locale, t } = useLocale();

  // 読み込み: コードは localStorage、画像と音は IndexedDB
  useEffect(() => {
    let initialLocale: Locale = "ja";
    try {
      const savedLoc = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(savedLoc)) initialLocale = savedLoc;
      else if (typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("ja")) {
        initialLocale = "en";
      }
    } catch {
      /* ignore */
    }
    const initMsgs = MESSAGES[initialLocale].editor.notices;

    const savedCode = localStorage.getItem(CODE_KEY);
    p.setInputCode(savedCode ?? getSampleCode(initialLocale));
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null");
      if (m) p.setMeta(toMeta(m));
      p.setThumbnail(localStorage.getItem(THUMB_KEY));
    } catch {
      /* 壊れたデータは無視する */
    }

    let alive = true;
    (async () => {
      // /make?load=作品名 で、ホームの作品を読み込んで改造できる
      const loadId = new URLSearchParams(window.location.search).get("load");
      if (loadId) {
        const hasWork = savedCode !== null && !isSampleCode(savedCode);
        const ok = !hasWork || window.confirm(initMsgs.confirmLoadProject(loadId));
        if (ok) {
          try {
            const proj = await fetchProject(loadId, undefined, initialLocale);
            await storeAssets(proj.assets);
            if (alive) {
              p.setAssets(proj.assets);
              p.setInputCode(proj.code);
              p.setMeta(proj.meta);
              p.saveThumbnail(proj.thumbnail);
              localStorage.setItem(CODE_KEY, proj.code);
              localStorage.setItem(META_KEY, JSON.stringify(proj.meta));
              window.history.replaceState(null, "", "/make"); // リロードで確認がまた出ないように
              return;
            }
          } catch (err: any) {
            if (alive) p.setNotice(initMsgs.loadProjectFailed(err?.message ?? String(err)));
          }
        } else {
          window.history.replaceState(null, "", "/make");
        }
      }
      try {
        let saved = (await loadAssets()).filter(isAsset);

        // 前のバージョンで localStorage に入れた画像があれば、引っ越す
        if (saved.length === 0) {
          try {
            const old = JSON.parse(localStorage.getItem(LEGACY_TEXTURE_KEY) ?? "[]");
            const legacy = Array.isArray(old) ? old.filter(isAsset) : [];
            if (legacy.length > 0) {
              await storeAssets(legacy);
              localStorage.removeItem(LEGACY_TEXTURE_KEY);
              saved = legacy;
            }
          } catch {
            /* 壊れたデータは無視する */
          }
        }
        if (alive) p.setAssets(saved);
      } catch {
        if (alive) {
          p.setNotice(initMsgs.storageOpenFailed);
        }
      }
    })();

    return () => {
      alive = false;
    };
    // 最初の 1 回だけ動かす(元の page.tsx と同じ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportProject = async () => {
    const blob = await buildMks(p.inputCode, p.assets, p.meta, p.thumbnail);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.mks";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportProject = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm(t.editor.notices.confirmImportProject)) return;

    try {
      const { code, assets: imported, meta: importedMeta, thumbnail: importedThumb } = await parseMks(file, locale);

      p.stopPreview();
      if (await p.saveAssets(imported)) {
        p.updateCode(code);
        p.setMeta(importedMeta);
        p.saveThumbnail(importedThumb);
        localStorage.setItem(META_KEY, JSON.stringify(importedMeta));
      }
    } catch (err: any) {
      p.setNotice(t.editor.notices.importProjectFailed(err?.message ?? String(err)));
    }
  };

  return { exportProject, onImportProject };
}
