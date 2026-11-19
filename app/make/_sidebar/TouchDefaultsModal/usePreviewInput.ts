import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { actionLabel, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import { dispatchTestInput } from "./dispatchTestInput";

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
  updateArea: (id: string, patch: Partial<TouchArea>) => void;
  setSelectedId: (id: string | null) => void;
  onClose: () => void;
};

/** プレビューの操作。「配置」はドラッグで動かす、「テスト」は押している間だけゲームに入力を送る。Esc で閉じる処理もここ */
export function usePreviewInput({ updateArea, setSelectedId, onClose }: Params) {
  const { locale, t } = useLocale();
  const [testMode, setTestMode] = useState(false);
  const [pressedAreaIds, setPressedAreaIds] = useState<string[]>([]);
  const [testMsgState, setTestMsgState] = useState<
    | { type: "initial" }
    | { type: "switched" }
    | { type: "pressing"; label: string; action: string }
    | { type: "released"; label: string; action: string }
  >({ type: "initial" });
  const testMessage =
    testMsgState.type === "initial"
      ? t.editor.touchModal.testInitial
      : testMsgState.type === "switched"
        ? t.editor.touchModal.testSwitched
        : testMsgState.type === "pressing"
          ? t.editor.touchModal.testPressing(testMsgState.label, testMsgState.action)
          : t.editor.touchModal.testReleased(testMsgState.label, testMsgState.action);
  const dragRef = useRef<DragState | null>(null);
  const testPressRef = useRef<Map<number, TouchArea>>(new Map());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && testPressRef.current.size === 0) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, area: TouchArea) => {
    const layer = event.currentTarget.parentElement;
    const rect = layer?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(area.id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* capture 非対応時も数値入力で編集できる */
    }
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

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    updateArea(drag.areaId, {
      x: drag.originX + ((event.clientX - drag.startX) / drag.layerWidth) * 100,
      y: drag.originY + ((event.clientY - drag.startY) / drag.layerHeight) * 100,
    });
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  const beginTestPress = (event: ReactPointerEvent<HTMLButtonElement>, area: TouchArea) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(area.id);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer Capture 非対応時も押下テストは可能
    }
    if (testPressRef.current.has(event.pointerId)) return;

    testPressRef.current.set(event.pointerId, area);
    setPressedAreaIds((current) => (current.includes(area.id) ? current : [...current, area.id]));
    setTestMsgState({ type: "pressing", label: area.label, action: actionLabel(area, locale) });
    dispatchTestInput(area, true);
  };

  const endTestPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const area = testPressRef.current.get(event.pointerId);
    if (!area) return;

    testPressRef.current.delete(event.pointerId);
    dispatchTestInput(area, false);
    const stillPressed = Array.from(testPressRef.current.values()).some((item) => item.id === area.id);
    if (!stillPressed) {
      setPressedAreaIds((current) => current.filter((id) => id !== area.id));
    }
    setTestMsgState({ type: "released", label: area.label, action: actionLabel(area, locale) });
  };

  const releaseAllTestPresses = () => {
    for (const area of testPressRef.current.values()) {
      dispatchTestInput(area, false);
    }
    testPressRef.current.clear();
    setPressedAreaIds([]);
  };

  useEffect(() => {
    const releaseOnWindowBlur = () => {
      releaseAllTestPresses();
    };
    window.addEventListener("blur", releaseOnWindowBlur);
    return () => {
      window.removeEventListener("blur", releaseOnWindowBlur);
      for (const area of testPressRef.current.values()) {
        dispatchTestInput(area, false);
      }
      testPressRef.current.clear();
    };
    // This effect intentionally owns only the window blur/unmount cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelDrag = () => {
    dragRef.current = null;
  };

  const switchToPlacement = () => {
    releaseAllTestPresses();
    dragRef.current = null;
    setTestMode(false);
  };

  const switchToTest = () => {
    dragRef.current = null;
    setTestMode(true);
    setTestMsgState({ type: "switched" });
  };

  return {
    testMode,
    pressedAreaIds,
    testMessage,
    beginDrag,
    moveDrag,
    endDrag,
    beginTestPress,
    endTestPress,
    cancelDrag,
    switchToPlacement,
    switchToTest,
  };
}

export type PreviewInput = ReturnType<typeof usePreviewInput>;
