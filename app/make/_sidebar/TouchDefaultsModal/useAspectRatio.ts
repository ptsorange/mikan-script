import { useEffect, useState } from "react";
import { ASPECT_STORAGE_KEY } from "./constants";

/** プレビューの画面比率(4:3 など)。入力のとちゅうの値も持ち、決めた比率は次に開いたときも使う */
export function useAspectRatio() {
  const [aspect, setAspect] = useState<string>("4 / 3");
  const [aspectWidth, setAspectWidth] = useState("4");
  const [aspectHeight, setAspectHeight] = useState("3");
  const [aspectLoaded, setAspectLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ASPECT_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { width?: unknown; height?: unknown };
        const width = Number(saved.width);
        const height = Number(saved.height);
        if (
          Number.isFinite(width) &&
          Number.isFinite(height) &&
          width > 0 &&
          height > 0 &&
          width <= 100000 &&
          height <= 100000
        ) {
          setAspectWidth(String(saved.width));
          setAspectHeight(String(saved.height));
          setAspect(`${width} / ${height}`);
        }
      }
    } catch {
      // 保存値が壊れていても既定の 4:3 を使う
    } finally {
      setAspectLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!aspectLoaded) return;
    const [widthPart, heightPart] = aspect.split("/").map((part) => part.trim());
    const width = Number(widthPart);
    const height = Number(heightPart);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    try {
      localStorage.setItem(ASPECT_STORAGE_KEY, JSON.stringify({ width, height }));
    } catch {
      // 比率の保存に失敗してもプレビュー編集は継続できる
    }
  }, [aspect, aspectLoaded]);

  const changeAspectPreset = (value: string) => {
    setAspect(value);
    const [width, height] = value.split("/").map((part) => part.trim());
    if (width && height) {
      setAspectWidth(width);
      setAspectHeight(height);
    }
  };

  const changeAspectPart = (axis: "width" | "height", raw: string) => {
    const nextWidth = axis === "width" ? raw : aspectWidth;
    const nextHeight = axis === "height" ? raw : aspectHeight;

    if (axis === "width") setAspectWidth(raw);
    else setAspectHeight(raw);

    const width = Number(nextWidth);
    const height = Number(nextHeight);
    if (
      nextWidth.trim() !== "" &&
      nextHeight.trim() !== "" &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      setAspect(`${width} / ${height}`);
    }
  };

  const resetAspectDraft = () => {
    const [width, height] = aspect.split("/").map((part) => part.trim());
    setAspectWidth(width || "4");
    setAspectHeight(height || "3");
  };

  return { aspect, aspectWidth, aspectHeight, changeAspectPreset, changeAspectPart, resetAspectDraft };
}

export type AspectRatio = ReturnType<typeof useAspectRatio>;
