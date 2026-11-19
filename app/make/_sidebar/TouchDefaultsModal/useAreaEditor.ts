import { useEffect, useState } from "react";
import {
  clamp,
  createTouchAreaId,
  DEFAULT_BUTTON_COLOR,
  MAX_AREAS,
  sanitizeAreas,
  type TouchArea,
  type TouchControlsConfig,
} from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

/** タッチボタン(当たり判定)の一覧と、選んでいるボタンの編集(追加・コピー・貼り付け・大きさ など) */
export function useAreaEditor(initialConfig?: TouchControlsConfig) {
  const { t } = useLocale();
  const [areas, setAreas] = useState<TouchArea[]>(() => sanitizeAreas(initialConfig?.areas ?? []));
  const [selectedId, setSelectedId] = useState<string | null>(() => initialConfig?.areas[0]?.id ?? null);
  const [clipboardArea, setClipboardArea] = useState<TouchArea | null>(null);
  const [sizeDrafts, setSizeDrafts] = useState<{ id: string; w: string; h: string } | null>(null);

  useEffect(() => {
    if (areas.length === 0) setSelectedId(null);
    else if (!areas.some((area) => area.id === selectedId)) setSelectedId(areas[0].id);
  }, [areas, selectedId]);

  const selected = areas.find((area) => area.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setSizeDrafts(null);
      return;
    }
    setSizeDrafts({ id: selected.id, w: String(Math.round(selected.w)), h: String(Math.round(selected.h)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const updateArea = (id: string, patch: Partial<TouchArea>) => {
    setAreas((current) =>
      current.map((area) => {
        if (area.id !== id) return area;
        const next = { ...area, ...patch };
        next.w = clamp(next.w, 0, 100);
        next.h = clamp(next.h, 0, 100);
        next.x = clamp(next.x, 0, 100 - next.w);
        next.y = clamp(next.y, 0, 100 - next.h);
        return next;
      })
    );
  };

  const updateSelected = (patch: Partial<TouchArea>) => {
    if (!selected) return;
    updateArea(selected.id, patch);
  };

  const commitSize = (axis: "w" | "h", raw: string) => {
    if (!selected) return;
    const current = axis === "w" ? selected.w : selected.h;
    const parsed = raw.trim() === "" ? current : Number(raw);
    const value = Number.isFinite(parsed) ? clamp(parsed, 0, 100) : current;
    updateArea(selected.id, { [axis]: value });
    setSizeDrafts((draft) =>
      draft?.id === selected.id ? { ...draft, [axis]: String(Math.round(value)) } : draft
    );
  };

  const addArea = () => {
    if (areas.length >= MAX_AREAS) return;
    const next: TouchArea = {
      id: createTouchAreaId(),
      label: t.touch.defaultButtonLabel(areas.length + 1),
      kind: "key",
      value: " ",
      x: 74,
      y: 72,
      w: 22,
      h: 20,
      opacity: 75,
      color: DEFAULT_BUTTON_COLOR,
    };
    setAreas((current) => [...current, next]);
    setSelectedId(next.id);
  };

  const copySelected = () => {
    if (!selected) return;
    setClipboardArea({ ...selected });
  };

  const pasteArea = () => {
    if (!clipboardArea || areas.length >= MAX_AREAS) return;
    const next: TouchArea = {
      ...clipboardArea,
      id: createTouchAreaId(),
      label: `${clipboardArea.label} ${t.touch.copySuffix}`.slice(0, 16),
      x: clamp(clipboardArea.x + 4, 0, 100 - clipboardArea.w),
      y: clamp(clipboardArea.y + 4, 0, 100 - clipboardArea.h),
    };
    setAreas((current) => (current.length < MAX_AREAS ? [...current, next] : current));
    setSelectedId(next.id);
  };

  const removeArea = (id: string) => {
    setAreas((current) => current.filter((area) => area.id !== id));
  };

  return {
    areas,
    setAreas,
    selectedId,
    setSelectedId,
    selected,
    clipboardArea,
    sizeDrafts,
    setSizeDrafts,
    updateArea,
    updateSelected,
    commitSize,
    addArea,
    copySelected,
    pasteArea,
    removeArea,
  };
}

export type AreaEditor = ReturnType<typeof useAreaEditor>;
