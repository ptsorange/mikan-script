import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { TouchArea } from "@/lib/touchControls";
import type { PointerState } from "./types";

type DragState = {
  pointerId: number;
  areaId: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  layerWidth: number;
  layerHeight: number;
};

type Params = {
  editing: boolean;
  started: boolean;
  touchEnabled: boolean;
  heldPointers: { current: Map<number, PointerState> };
  syncPointer: (pointerId: number, layer: HTMLElement, clientX: number, clientY: number) => void;
  releaseAction: (token: string, clientX?: number, clientY?: number) => void;
  setSelectedId: (id: string | null) => void;
  updateArea: (id: string, patch: Partial<TouchArea>) => void;
};

/** ボタンの上でのポインター操作。編集中はドラッグで動かし、ふだんは押している間だけゲームに入力する */
export function usePointerHandlers({ editing, started, touchEnabled, heldPointers, syncPointer, releaseAction, setSelectedId, updateArea }: Params) {
  const dragRef = useRef<DragState | null>(null);

  const beginEditDrag = (event: ReactPointerEvent<HTMLButtonElement>, area: TouchArea) => {
    const layer = event.currentTarget.parentElement;
    const rect = layer?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(area.id);
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture 非対応時も位置入力で編集できる */ }
    dragRef.current = {
      pointerId: event.pointerId,
      areaId: area.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: area.x,
      originY: area.y,
      layerWidth: rect.width,
      layerHeight: rect.height,
    };
  };

  const beginPress = (event: ReactPointerEvent<HTMLButtonElement>, area: TouchArea) => {
    event.preventDefault();
    event.stopPropagation();
    if (editing) {
      beginEditDrag(event, area);
      return;
    }
    if (!started || !touchEnabled || heldPointers.current.has(event.pointerId)) return;
    const layer = event.currentTarget.parentElement;
    if (!layer) return;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture 非対応時も押下は動く */ }
    heldPointers.current.set(event.pointerId, { tokens: new Set() });
    syncPointer(event.pointerId, layer, event.clientX, event.clientY);
  };

  const endPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (editing) {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
      return;
    }
    const pointer = heldPointers.current.get(event.pointerId);
    if (!pointer) return;
    pointer.tokens.forEach((token) => releaseAction(token, event.clientX, event.clientY));
    heldPointers.current.delete(event.pointerId);
  };

  const moveArea = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (editing && drag?.pointerId === event.pointerId) {
      event.preventDefault();
      updateArea(drag.areaId, {
        x: drag.originX + (event.clientX - drag.startX) / drag.layerWidth * 100,
        y: drag.originY + (event.clientY - drag.startY) / drag.layerHeight * 100,
      });
      return;
    }
    if (!heldPointers.current.has(event.pointerId)) return;
    const layer = event.currentTarget.parentElement;
    if (layer) syncPointer(event.pointerId, layer, event.clientX, event.clientY);
  };

  const cancelDrag = () => {
    dragRef.current = null;
  };

  return { beginPress, endPress, moveArea, cancelDrag };
}

export type PointerHandlers = ReturnType<typeof usePointerHandlers>;
