import { useRef, useState } from "react";
import type { Asset } from "@/lib/mks";

// サウンドパネルでの音の試し聞き
export function useSoundPreview(setNotice: (msg: string) => void) {
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null); // 試し聞き中の音

  const stopPreview = () => {
    previewRef.current?.pause();
    previewRef.current = null;
    setPreviewName(null);
  };

  const togglePreview = (a: Asset) => {
    if (previewName === a.name) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(a.data);
    previewRef.current = audio;
    setPreviewName(a.name);
    audio.onended = () => {
      if (previewRef.current === audio) stopPreview();
    };
    audio.play().catch(() => {
      if (previewRef.current === audio) stopPreview();
      setNotice("この音は鳴らせなかったよ。");
    });
  };

  return { previewName, stopPreview, togglePreview };
}
