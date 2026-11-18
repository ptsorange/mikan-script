import { useEffect, useRef, type RefObject } from "react";
import type { GameFrameHandle } from "@/app/_components/GameFrame";
import { clamp, normalizeKey, type MouseButton, type TouchArea } from "@/lib/touchControls";
import type { HeldAction, PointerState } from "./types";

type Params = {
  frameRef: RefObject<GameFrameHandle | null>;
  areas: TouchArea[];
  started: boolean;
  editing: boolean;
  touchEnabled: boolean;
};

/** 押しているボタンの状態を持ち、ゲームにキーボード・マウスの入力として送る(押す・離す・動かす) */
export function useHeldInput({ frameRef, areas, started, editing, touchEnabled }: Params) {
  const heldPointers = useRef(new Map<number, PointerState>());
  const actionCounts = useRef(new Map<string, number>());
  const actionMeta = useRef(new Map<string, HeldAction>());
  const areasRef = useRef(areas);
  areasRef.current = areas;

  const getMousePoint = (clientX: number, clientY: number) => {
    const rect = frameRef.current?.getBounds();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };
    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  };

  const fire = (action: HeldAction, pressed: boolean, clientX?: number, clientY?: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    if (action.kind === "key") {
      frame.pressKey(normalizeKey(action.value), pressed);
    } else {
      const point = clientX === undefined || clientY === undefined
        ? { x: 0.5, y: 0.5 }
        : getMousePoint(clientX, clientY);
      frame.pressMouse(action.value as MouseButton, pressed, point.x, point.y);
    }
  };

  const holdAction = (action: HeldAction, clientX: number, clientY: number) => {
    const count = actionCounts.current.get(action.token) ?? 0;
    actionCounts.current.set(action.token, count + 1);
    if (count === 0) {
      actionMeta.current.set(action.token, action);
      fire(action, true, clientX, clientY);
    } else if (action.kind === "mouse") {
      const point = getMousePoint(clientX, clientY);
      frameRef.current?.moveMouse(point.x, point.y);
    }
  };

  const releaseAction = (token: string, clientX?: number, clientY?: number) => {
    const count = actionCounts.current.get(token) ?? 0;
    if (count <= 1) {
      const action = actionMeta.current.get(token);
      actionCounts.current.delete(token);
      actionMeta.current.delete(token);
      if (action) fire(action, false, clientX, clientY);
    } else {
      actionCounts.current.set(token, count - 1);
    }
  };

  const releaseAll = () => {
    actionMeta.current.forEach((action) => fire(action, false));
    heldPointers.current.clear();
    actionCounts.current.clear();
    actionMeta.current.clear();
  };

  // 押しているポインターが現在どのボタン上にあるかを毎回調べる。
  // ボタンの外へ移動したら解除し、別のボタンへ移動したらそちらを押下する。
  const syncPointer = (
    pointerId: number,
    layer: HTMLElement,
    clientX: number,
    clientY: number,
  ) => {
    const pointer = heldPointers.current.get(pointerId);
    if (!pointer) return;

    const nextActions = new Map<string, HeldAction>();
    const buttons = layer.querySelectorAll<HTMLButtonElement>(".ms-touch-area");
    buttons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
      const area = areasRef.current.find((item) => item.id === button.dataset.areaId);
      if (!area) return;
      const token = area.kind === "key"
        ? `key:${normalizeKey(area.value)}`
        : `mouse:${area.value}`;
      nextActions.set(token, { token, kind: area.kind, value: area.value });
    });

    for (const token of pointer.tokens) {
      if (!nextActions.has(token)) releaseAction(token, clientX, clientY);
    }
    for (const [token, action] of nextActions) {
      if (!pointer.tokens.has(token)) holdAction(action, clientX, clientY);
    }
    pointer.tokens = new Set(nextActions.keys());

    if (Array.from(nextActions.values()).some((action) => action.kind === "mouse")) {
      const point = getMousePoint(clientX, clientY);
      frameRef.current?.moveMouse(point.x, point.y);
    }
  };

  useEffect(() => {
    const onBlur = () => releaseAll();
    const onVisibility = () => { if (document.hidden) releaseAll(); };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      releaseAll();
    };
    // refs は固定。アンマウント時も押下状態を必ず解除する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started || editing || !touchEnabled) releaseAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, editing, touchEnabled]);

  return { heldPointers, releaseAction, releaseAll, syncPointer };
}
