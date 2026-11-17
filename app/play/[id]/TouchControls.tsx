"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { GameFrameHandle } from "@/app/_components/GameFrame";
import {
  actionLabel,
  BUILTIN_PRESETS,
  BUILTIN_PRESET_IDS,
  colorWithOpacity,
  createTouchAreaId,
  DEFAULT_BUTTON_COLOR,
  hasTouchControlsConfig,
  keyLabel,
  MAX_AREAS,
  normalizeKey,
  PRESETS_STORAGE_KEY,
  resolveTouchControlsState,
  sanitizeAreas,
  withBuiltinPresets,
  type MouseButton,
  type TouchArea,
  type TouchControlsConfig,
  type TouchPreset,
} from "@/lib/touchControls";

type HeldAction = { token: string; kind: TouchArea["kind"]; value: string };
type PointerState = { tokens: Set<string> };
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
type Props = {
  projectId: string;
  started: boolean;
  layoutKey: string;
  defaultTouchControls?: TouchControlsConfig;
  stageRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<GameFrameHandle | null>;
  /** 設定パネルを出す場所(ゲーム画面の外)。なければ画面の上に重ねて出す */
  panelHost?: HTMLElement | null;
  /** 「タッチ操作設定」ボタンを置く場所(スタート・音量ボタンの並び)。なければ画面の右下に重ねて出す */
  toggleHost?: HTMLElement | null;
  /** いま全画面か(全画面の中にはパネルを出せないので、開くときに全画面を終える) */
  isFullscreen?: boolean;
  onExitFullscreen?: () => void;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const storageKey = (id: string) => `mikan-script-touch-controls:${id}`;
const enabledStorageKey = (id: string) => `mikan-script-touch-controls-enabled:${id}`;

export default function TouchControls({
  projectId,
  started,
  layoutKey,
  defaultTouchControls,
  stageRef,
  frameRef,
  panelHost,
  toggleHost,
  isFullscreen = false,
  onExitFullscreen,
}: Props) {
  const [areas, setAreas] = useState<TouchArea[]>([]);
  const [touchEnabled, setTouchEnabled] = useState(true);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [hasCustomSettings, setHasCustomSettings] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clipboardArea, setClipboardArea] = useState<TouchArea | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [presets, setPresets] = useState<TouchPreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetName, setPresetName] = useState("アクション操作");
  const [selectedPresetId, setSelectedPresetId] = useState(BUILTIN_PRESETS[0].id);
  const [sizeDrafts, setSizeDrafts] = useState<{ id: string; w: string; h: string } | null>(null);

  const areasDirtyRef = useRef(false);
  const prevProjectIdRef = useRef<string | null>(null);

  // プロジェクトごとに、このブラウザへ設定を保存する。保存値がなければ作品のデフォルト設定を使う。
  useEffect(() => {
    const projectChanged = prevProjectIdRef.current !== projectId;
    prevProjectIdRef.current = projectId;
    setLoadedFor(null);

    let storedAreasRaw: string | null = null;
    let storedEnabledRaw: string | null = null;
    try {
      storedAreasRaw = localStorage.getItem(storageKey(projectId));
      storedEnabledRaw = localStorage.getItem(enabledStorageKey(projectId));
    } catch {
      storedAreasRaw = null;
      storedEnabledRaw = null;
    }

    const resolved = resolveTouchControlsState({
      storedAreasRaw,
      storedEnabledRaw,
      defaultConfig: defaultTouchControls,
    });

    if (projectChanged) {
      areasDirtyRef.current = resolved.hasCustomAreas;
      setAreas(resolved.areas);
      setTouchEnabled(resolved.enabled);
      setHasCustomSettings(resolved.hasCustomAreas || resolved.hasCustomEnabled);
      setSelectedId(null);
    } else {
      if (storedAreasRaw === null && !areasDirtyRef.current) {
        setAreas(resolved.areas);
      }
      if (storedEnabledRaw === null) {
        setTouchEnabled(resolved.enabled);
      }
    }
    setLoadedFor(projectId);
  }, [projectId, defaultTouchControls]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
      setPresets(withBuiltinPresets(raw ? JSON.parse(raw) : []));
    } catch {
      setPresets(withBuiltinPresets([]));
    } finally {
      setPresetsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!presetsLoaded) return;
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // 共通プリセットを保存できなくても、現在の作品の操作には影響させない。
    }
  }, [presets, presetsLoaded]);

  useEffect(() => {
    // 別プロジェクトの古い state や未変更のデフォルト値を、カスタム設定として保存しない。
    if (loadedFor !== projectId || !areasDirtyRef.current) return;
    try {
      localStorage.setItem(storageKey(projectId), JSON.stringify(areas));
    } catch {
      // ストレージが使えない環境でもゲーム自体は操作できる。
    }
  }, [areas, loadedFor, projectId]);

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
    // 選択対象が変わったときだけ入力中の下書きを初期化する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const heldPointers = useRef(new Map<number, PointerState>());
  const actionCounts = useRef(new Map<string, number>());
  const actionMeta = useRef(new Map<string, HeldAction>());
  const dragRef = useRef<DragState | null>(null);
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

  const changeTouchEnabled = (enabled: boolean) => {
    if (!enabled) releaseAll();
    setTouchEnabled(enabled);
    setHasCustomSettings(true);
    try {
      localStorage.setItem(enabledStorageKey(projectId), String(enabled));
    } catch {
      // 保存できなくても現在の画面では切り替えを反映する。
    }
  };

  const resetToProjectDefault = () => {
    if (!defaultTouchControls) return;
    releaseAll();
    dragRef.current = null;
    areasDirtyRef.current = false;
    try {
      localStorage.removeItem(storageKey(projectId));
      localStorage.removeItem(enabledStorageKey(projectId));
    } catch {
      // ignore
    }
    const nextAreas = sanitizeAreas(defaultTouchControls.areas);
    setAreas(nextAreas);
    setTouchEnabled(defaultTouchControls.enabled);
    setSelectedId(nextAreas[0]?.id ?? null);
    setHasCustomSettings(false);
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

  // iframe の実際の表示位置に合わせて、操作領域を重ねる。
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    const frame = stage.querySelector("iframe");
    const update = () => {
      const stageBox = stage.getBoundingClientRect();
      const frameBox = frameRef.current?.getBounds();
      if (!frameBox || frameBox.width <= 0 || frameBox.height <= 0) {
        setViewport({ left: 0, top: 0, width: stageBox.width, height: stageBox.height });
        return;
      }
      setViewport({
        left: frameBox.left - stageBox.left,
        top: frameBox.top - stageBox.top,
        width: frameBox.width,
        height: frameBox.height,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    if (frame) observer.observe(frame);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    raf = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [frameRef, layoutKey, stageRef]);

  const markAreasDirty = () => {
    areasDirtyRef.current = true;
    setHasCustomSettings(true);
  };

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

  const savePreset = () => {
    const name = presetName.trim().slice(0, 24);
    if (!name) return;
    const preset: TouchPreset = {
      id: createTouchAreaId(),
      name,
      areas: areas.map((area) => ({ ...area })),
    };
    setPresets((current) => {
      const custom = current.filter((item) =>
        !BUILTIN_PRESET_IDS.has(item.id) && item.name.toLowerCase() !== name.toLowerCase()
      );
      return withBuiltinPresets([preset, ...custom].slice(0, 19));
    });
    setSelectedPresetId(preset.id);
  };

  const loadPreset = () => {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    const nextAreas = sanitizeAreas(preset.areas).slice(0, MAX_AREAS).map((area) => ({ ...area, id: createTouchAreaId() }));
    applyAreas(nextAreas);
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
      label: `ボタン ${areas.length + 1}`,
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
      label: `${clipboardArea.label} コピー`.slice(0, 16),
      x: clamp(clipboardArea.x + 4, 0, 100 - clipboardArea.w),
      y: clamp(clipboardArea.y + 4, 0, 100 - clipboardArea.h),
    };
    setAreas((current) => current.length < MAX_AREAS ? [...current, next] : current);
    setSelectedId(next.id);
    setOpen(true);
    setEditing(true);
  };

  const removeSelected = () => {
    if (!selected) return;
    releaseAll();
    dragRef.current = null;
    markAreasDirty();
    setAreas((current) => current.filter((area) => area.id !== selected.id));
  };

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

  const togglePanel = () => {
    if (!open) {
      if (isFullscreen) onExitFullscreen?.(); // パネルはゲーム画面の外に出るので、全画面は終える
      releaseAll();
      setEditing(true);
    } else {
      setEditing(false);
    }
    setOpen((value) => !value);
  };

  const layerStyle = {
    left: viewport.left,
    top: viewport.top,
    width: viewport.width,
    height: viewport.height,
  };

  const hasProjectDefault = hasTouchControlsConfig(defaultTouchControls);

  const panelNode = (
    <section className="ms-touch-panel" aria-label="タッチ操作の設定" onPointerDown={(event) => event.stopPropagation()}>
      <div className="ms-touch-panel-head">
        <strong>タッチ操作</strong>
        <div className="ms-touch-panel-status">
          <label className="ms-touch-enable-toggle">
            <input
              type="checkbox"
              checked={touchEnabled}
              onChange={(event) => changeTouchEnabled(event.target.checked)}
            />
            タッチ操作を有効にする
          </label>
          <span>{areas.length}/{MAX_AREAS}</span>
        </div>
      </div>
      <div className="ms-touch-panel-actions">
        <button type="button" className="ms-btn ms-btn-green" onClick={addArea} disabled={areas.length >= MAX_AREAS}>
          ＋ 当たり判定を追加
        </button>
        <div className="ms-touch-copy-paste">
          <button type="button" className="ms-btn" onClick={copySelected} disabled={!selected}>
            ⧉ コピー
          </button>
          <button type="button" className="ms-btn" onClick={pasteArea} disabled={!clipboardArea || areas.length >= MAX_AREAS}>
            ▣ 貼り付け
          </button>
          <button type="button" className="ms-btn ms-btn-red ms-touch-close" aria-expanded={open} onClick={togglePanel}>
            ✕ 操作設定を閉じる
          </button>
        </div>
        {hasProjectDefault && (
          <button
            type="button"
            className="ms-btn"
            onClick={resetToProjectDefault}
            disabled={!hasCustomSettings}
          >
            ↺ 作品のデフォルトに戻す
          </button>
        )}
        <label className="ms-touch-edit-toggle">
          <input
            type="checkbox"
            checked={editing}
            onChange={(event) => {
              setEditing(event.target.checked);
              if (event.target.checked) releaseAll();
            }}
          />
          配置を編集
        </label>
      </div>
      <div className="ms-touch-presets">
        <label className="ms-touch-preset-name">
          共通設定の名前
          <input value={presetName} maxLength={24} onChange={(event) => setPresetName(event.target.value)} placeholder="例: 横スクロール操作" />
        </label>
        <div className="ms-touch-preset-actions">
          <button type="button" className="ms-btn ms-btn-blue" onClick={savePreset} disabled={!presetName.trim()}>
            共通保存
          </button>
        </div>
        <div className="ms-touch-preset-load">
          <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)} aria-label="保存済みの共通設定">
            <option value="">保存した設定を選択…</option>
            {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
          <button type="button" className="ms-btn" onClick={loadPreset} disabled={!presets.some((preset) => preset.id === selectedPresetId)}>
            ロード
          </button>
        </div>
        <p className="ms-touch-hint">サンプル設定は最初から登録されています。選択して「ロード」すると、保存済み設定と同じように使えます。共通保存した設定も、このブラウザの別の作品でロードできます。</p>
      </div>
      {areas.length === 0 ? (
        <p className="ms-touch-empty">「当たり判定を追加」からタッチボタンを作成できます。</p>
      ) : (
        <div className="ms-touch-editor">
          <div className="ms-touch-list" aria-label="当たり判定一覧">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className={selectedId === area.id ? "is-active" : ""}
                onClick={() => setSelectedId(area.id)}
              >
                <span>{area.label}</span>
                <small>{actionLabel(area)}</small>
              </button>
            ))}
          </div>
          {selected && (
            <div className="ms-touch-fields">
              <label>
                表示名
                <input value={selected.label} maxLength={16} onChange={(event) => updateSelected({ label: event.target.value })} />
              </label>
              <label>
                割り当て
                <select
                  value={selected.kind}
                  onChange={(event) => updateSelected({ kind: event.target.value as TouchArea["kind"], value: event.target.value === "mouse" ? "left" : " " })}
                >
                  <option value="key">キーボード</option>
                  <option value="mouse">マウス</option>
                </select>
              </label>
              {selected.kind === "key" ? (
                <label>
                  キー
                  <input
                    value={keyLabel(selected.value)}
                    maxLength={32}
                    placeholder="例: Space / ArrowUp / z"
                    onChange={(event) => updateSelected({ value: event.target.value === "Space" ? " " : event.target.value })}
                  />
                </label>
              ) : (
                <label>
                  マウスボタン
                  <select value={selected.value} onChange={(event) => updateSelected({ value: event.target.value })}>
                    <option value="left">左クリック</option>
                    <option value="middle">中クリック</option>
                    <option value="right">右クリック</option>
                  </select>
                </label>
              )}
              <div className="ms-touch-numbers">
                <label>X (%)<input type="number" min="0" max={100 - selected.w} value={Math.round(selected.x)} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} /></label>
                <label>Y (%)<input type="number" min="0" max={100 - selected.h} value={Math.round(selected.y)} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} /></label>
                <label>幅 (%)<input
                  type="number" min="0" max="100" step="1"
                  value={sizeDrafts?.id === selected.id ? sizeDrafts.w : String(Math.round(selected.w))}
                  onChange={(event) => setSizeDrafts((draft) => ({
                    id: selected.id,
                    w: event.target.value,
                    h: draft?.id === selected.id ? draft.h : String(Math.round(selected.h)),
                  }))}
                  onBlur={(event) => commitSize("w", event.currentTarget.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                /></label>
                <label>高さ (%)<input
                  type="number" min="0" max="100" step="1"
                  value={sizeDrafts?.id === selected.id ? sizeDrafts.h : String(Math.round(selected.h))}
                  onChange={(event) => setSizeDrafts((draft) => ({
                    id: selected.id,
                    w: draft?.id === selected.id ? draft.w : String(Math.round(selected.w)),
                    h: event.target.value,
                  }))}
                  onBlur={(event) => commitSize("h", event.currentTarget.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                /></label>
              </div>
              <div className="ms-touch-appearance">
                <label>ボタン色<input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
                <label className="ms-touch-opacity">
                  不透明度 ({selected.opacity}%)
                  <input type="range" min="0" max="100" step="1" value={selected.opacity} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} />
                </label>
              </div>
              <p className="ms-touch-hint">ボタンをドラッグして移動できます。押している間にボタン領域から指・ポインターが外れると解除され、別のボタンに移動すると切り替わります。</p>
              <button type="button" className="ms-btn ms-btn-red ms-touch-delete" onClick={removeSelected}>
                削除
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <>
      {((started && touchEnabled) || (open && editing)) && areas.length > 0 && viewport.width > 0 && (
        <div className="ms-touch-layer" style={layerStyle} aria-label="タッチ操作">
          {areas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`ms-touch-area${editing ? " is-editing" : ""}`}
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.w}%`,
                height: `${area.h}%`,
                backgroundColor: colorWithOpacity(area.color, area.opacity / 100),
              }}
              data-area-id={area.id}
              aria-label={`${area.label} (${actionLabel(area)})`}
              onPointerDown={(event) => beginPress(event, area)}
              onPointerUp={endPress}
              onPointerCancel={endPress}
              onLostPointerCapture={endPress}
              onPointerMove={moveArea}
              onContextMenu={(event) => event.preventDefault()}
            >
              <span>{area.label}</span>
              <small>{actionLabel(area)}</small>
            </button>
          ))}
        </div>
      )}
      {toggleHost
        ? createPortal(
            <button
              type="button"
              className={`ms-btn ms-touch-toggle is-inline${open ? " is-open" : ""}`}
              aria-expanded={open}
              onClick={(event) => {
                togglePanel();
                event.currentTarget.blur();
              }}
            >
              🎮 タッチ操作設定
            </button>,
            toggleHost,
          )
        : !open && (
            <div className="ms-touch-controls">
              <button type="button" className="ms-touch-toggle" aria-expanded={open} onClick={togglePanel}>
                🎮 タッチ操作設定
              </button>
            </div>
          )}
      {open && (panelHost ? createPortal(panelNode, panelHost) : panelNode)}
    </>
  );
}
