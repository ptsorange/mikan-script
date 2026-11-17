"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

/* 全画面の切り替え。
   - 普通のブラウザ: Fullscreen API(Safari の webkit 接頭辞つきも対応)
   - iPhone の Safari など Fullscreen API が使えない、または拒否されたとき:
     「疑似全画面」。要素に is-pseudo-fs を付けて、CSS で画面いっぱいに固定表示する。
     背景のスクロールは止め、Esc で戻れる。 */
export function useFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [nativeFs, setNativeFs] = useState(false);
  const [pseudoFs, setPseudoFs] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const doc = document as WebkitDocument;
      const fs = !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
      setNativeFs(fs);
      if (fs) setPseudoFs(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  useEffect(() => {
    if (!pseudoFs) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPseudoFs(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudoFs]);

  const toggle = useCallback(async () => {
    const doc = document as WebkitDocument;
    if (pseudoFs) {
      setPseudoFs(false);
      return;
    }
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } catch {
        /* 何もしない */
      }
      return;
    }
    const el = targetRef.current as WebkitElement | null;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else setPseudoFs(true);
    } catch {
      setPseudoFs(true);
    }
  }, [pseudoFs, targetRef]);

  return { isFullscreen: nativeFs || pseudoFs, pseudoFs, toggle };
}
