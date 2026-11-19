import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { clamp, createTouchAreaId, DEFAULT_BUTTON_COLOR, MAX_AREAS, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

type Params = {
  areas: TouchArea[];
  setAreas: Dispatch<SetStateAction<TouchArea[]>>;
  selected: TouchArea | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  markAreasDirty: () => void;
  releaseAll: () => void;
  setOpen: (open: boolean) => void;
  setEditing: (editing: boolean) => void;
};

/** タッチボタンの編集(追加・コピー・貼り付け・位置や大きさの変更)。「削除」は、ドラッグも止める必要があるので index.tsx にある */
export function useAreaOps({ areas, setAreas, selected, selectedId, setSelectedId, markAreasDirty, releaseAll, setOpen, setEditing }: Params) {
  const { t } = useLocale();
  const [clipboardArea, setClipboardArea] = useState<TouchArea | null>(null);
  const [sizeDrafts, setSizeDrafts] = useState<{ id: string; w: string; h: string } | null>(null);

  useEffect(() => {
    if (!selected) {
      setSizeDrafts(null);
      return;
    }
    setSizeDrafts({ id: selected.id, w: String(Math.round(selected.w)), h: String(Math.round(selected.h)) });
    // 選択対象が変わったときだけ入力中の下書きを初期化する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const updateArea = (id: string, patch: Partial<TouchArea>) => {
    markAreasDirty();
    setAreas((current) => current.map((area) => {
      if (area.id !== id) return area;
      const next = { ...area, ...patch };
      next.w = clamp(next.w, 0, 100);
      next.h = clamp(next.h, 0, 100);
      next.x = clamp(next.x, 0, 100 - next.w);
      next.y = clamp(next.y, 0, 100 - next.h);
      return next;
    }));
  };

  const updateSelected = (patch: Partial<TouchArea>) => {
    if (!selected) return;
    updateArea(selected.id, patch);
  };

  const applyAreas = (nextAreas: TouchArea[]) => {
    releaseAll();
    markAreasDirty();
    setAreas(nextAreas.slice(0, MAX_AREAS));
    setSelectedId(nextAreas[0]?.id ?? null);
    setOpen(true);
    setEditing(true);
  };

  const commitSize = (axis: "w" | "h", raw: string) => {
    if (!selected) return;
    const current = axis === "w" ? selected.w : selected.h;
    const parsed = raw.trim() === "" ? current : Number(raw);
    const value = Number.isFinite(parsed) ? clamp(parsed, 0, 100) : current;
    updateArea(selected.id, { [axis]: value });
    setSizeDrafts((draft) => draft?.id === selected.id
      ? { ...draft, [axis]: String(Math.round(value)) }
      : draft);
  };

  const addArea = () => {
    if (areas.length >= MAX_AREAS) return;
    releaseAll();
    markAreasDirty();
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
    setOpen(true);
    setEditing(true);
  };

  const copySelected = () => {
    if (!selected) return;
    setClipboardArea({ ...selected });
  };

  const pasteArea = () => {
    if (!clipboardArea || areas.length >= MAX_AREAS) return;
    releaseAll();
    markAreasDirty();
    const next: TouchArea = {
      ...clipboardArea,
      id: createTouchAreaId(),
      label: `${clipboardArea.label} ${t.touch.copySuffix}`.slice(0, 16),
      x: clamp(clipboardArea.x + 4, 0, 100 - clipboardArea.w),
      y: clamp(clipboardArea.y + 4, 0, 100 - clipboardArea.h),
    };
    setAreas((current) => current.length < MAX_AREAS ? [...current, next] : current);
    setSelectedId(next.id);
    setOpen(true);
    setEditing(true);
  };

  return {
    clipboardArea,
    sizeDrafts,
    setSizeDrafts,
    updateArea,
    updateSelected,
    applyAreas,
    commitSize,
    addArea,
    copySelected,
    pasteArea,
  };
}
