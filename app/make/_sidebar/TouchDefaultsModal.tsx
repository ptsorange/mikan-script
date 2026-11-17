"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  actionLabel,
  BUILTIN_PRESETS,
  BUILTIN_PRESET_IDS,
  clamp,
  colorWithOpacity,
  createTouchAreaId,
  DEFAULT_BUTTON_COLOR,
  keyLabel,
  MAX_AREAS,
  PRESETS_STORAGE_KEY,
  sanitizeAreas,
  sanitizeTouchControls,
  withBuiltinPresets,
  type TouchArea,
  type TouchControlsConfig,
  type TouchPreset,
} from "@/lib/touchControls";

type Props = {
  initialConfig?: TouchControlsConfig;
  previewImage: string | null;
  onSave: (next: TouchControlsConfig | undefined) => void;
  onClose: () => void;
};

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

const ASPECT_OPTIONS = [
  { id: "4 / 3", label: "4:3 (標準 400×300)" },
  { id: "3 / 2", label: "3:2 (600×400)" },
  { id: "16 / 9", label: "16:9 (ワイド)" },
  { id: "1 / 1", label: "1:1 (正方形)" },
  { id: "9 / 16", label: "9:16 (縦長)" },
] as const;

const ASPECT_STORAGE_KEY = "kc-touch-preview-aspect-v1";

function getLegacyKeyCode(key: string): number {
  const known: Record<string, number> = {
    " ": 32,
    Space: 32,
    Enter: 13,
    Escape: 27,
    Backspace: 8,
    Tab: 9,
    Shift: 16,
    Control: 17,
    Alt: 18,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Delete: 46,
  };
  if (known[key] !== undefined) return known[key];
  return key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0;
}

function getInputCode(key: string): string {
  if (key === " ") return "Space";
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return key;
}

/**
 * 設定画面のテストボタンから、ページ内のゲーム画面へ入力イベントを送る。
 * 同一オリジンの iframe が使われている場合も対象にする。
 */
function dispatchTestInput(area: TouchArea, pressed: boolean) {
  if (typeof document === "undefined") return;

  const documents: Document[] = [document];
  for (const frame of Array.from(document.querySelectorAll("iframe"))) {
    try {
      const frameDocument = frame.contentDocument;
      if (frameDocument && !documents.includes(frameDocument)) documents.push(frameDocument);
    } catch {
      // 別オリジンの iframe にはアクセスできない
    }
  }

  for (const doc of documents) {
    const target: EventTarget = doc.querySelector("canvas") ?? doc.body ?? doc;

    if (area.kind === "key") {
      const key = area.value === " " ? " " : area.value;
      const event = new KeyboardEvent(pressed ? "keydown" : "keyup", {
        key,
        code: getInputCode(key),
        bubbles: true,
        cancelable: true,
      });
      const legacyCode = getLegacyKeyCode(key);
      try {
        Object.defineProperties(event, {
          keyCode: { get: () => legacyCode },
          which: { get: () => legacyCode },
        });
      } catch {
        // key/code が利用できれば旧式プロパティは不要
      }
      target.dispatchEvent(event);
    } else {
      const button = area.value === "middle" ? 1 : area.value === "right" ? 2 : 0;
      const buttons = pressed ? (1 << button) : 0;
      target.dispatchEvent(
        new MouseEvent(pressed ? "mousedown" : "mouseup", {
          button,
          buttons,
          bubbles: true,
          cancelable: true,
          view: doc.defaultView,
        })
      );
      if (!pressed) {
        // 通常のクリックと同様、mouseup の後に click も発生させる
        target.dispatchEvent(
          new MouseEvent("click", {
            button,
            buttons: 0,
            bubbles: true,
            cancelable: true,
            detail: 1,
            view: doc.defaultView,
          })
        );
      }
    }
  }
}

export default function TouchDefaultsModal({ initialConfig, previewImage, onSave, onClose }: Props) {
  const [enabled, setEnabled] = useState<boolean>(initialConfig?.enabled ?? true);
  const [areas, setAreas] = useState<TouchArea[]>(() => sanitizeAreas(initialConfig?.areas ?? []));
  const [selectedId, setSelectedId] = useState<string | null>(() => initialConfig?.areas[0]?.id ?? null);
  const [clipboardArea, setClipboardArea] = useState<TouchArea | null>(null);
  const [presets, setPresets] = useState<TouchPreset[]>(() => BUILTIN_PRESETS);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetName, setPresetName] = useState("アクション操作");
  const [selectedPresetId, setSelectedPresetId] = useState(BUILTIN_PRESETS[0].id);
  const [aspect, setAspect] = useState<string>("4 / 3");
  const [aspectWidth, setAspectWidth] = useState("4");
  const [aspectHeight, setAspectHeight] = useState("3");
  const [aspectLoaded, setAspectLoaded] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [pressedAreaIds, setPressedAreaIds] = useState<string[]>([]);
  const [testMessage, setTestMessage] = useState("「テスト」に切り替えると、配置したボタンを実際に押して試せます。");
  const [sizeDrafts, setSizeDrafts] = useState<{ id: string; w: string; h: string } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const testPressRef = useRef<Map<number, TouchArea>>(new Map());

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
      // プリセット保存に失敗しても作品設定自体は編集できる
    }
  }, [presets, presetsLoaded]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && testPressRef.current.size === 0) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (areas.length === 0) setSelectedId(null);
    else if (!areas.some((area) => area.id === selectedId)) setSelectedId(areas[0].id);
  }, [areas, selectedId]);

  const selected = areas.find((area) => area.id === selectedId) ?? null;

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
      label: `${clipboardArea.label} コピー`.slice(0, 16),
      x: clamp(clipboardArea.x + 4, 0, 100 - clipboardArea.w),
      y: clamp(clipboardArea.y + 4, 0, 100 - clipboardArea.h),
    };
    setAreas((current) => (current.length < MAX_AREAS ? [...current, next] : current));
    setSelectedId(next.id);
  };

  const removeSelected = () => {
    if (!selected) return;
    dragRef.current = null;
    setAreas((current) => current.filter((area) => area.id !== selected.id));
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
      const custom = current.filter(
        (item) => !BUILTIN_PRESET_IDS.has(item.id) && item.name.toLowerCase() !== name.toLowerCase()
      );
      return withBuiltinPresets([preset, ...custom].slice(0, 19));
    });
    setSelectedPresetId(preset.id);
  };

  const loadPreset = () => {
    const preset = presets.find((item) => item.id === selectedPresetId);
    if (!preset) return;
    const nextAreas = sanitizeAreas(preset.areas)
      .slice(0, MAX_AREAS)
      .map((area) => ({ ...area, id: createTouchAreaId() }));
    setAreas(nextAreas);
    setSelectedId(nextAreas[0]?.id ?? null);
  };

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
    setTestMessage(`${area.label}（${actionLabel(area)}）を押しています`);
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
    setTestMessage(`${area.label}（${actionLabel(area)}）を離しました`);
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

  const handleSave = () => {
    onSave(sanitizeTouchControls({ enabled, areas }));
    onClose();
  };

  return (
    <div
      className="kc-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kc-touch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kc-touch-modal-title"
      >
        <header className="kc-touch-modal-head">
          <div>
            <h2 id="kc-touch-modal-title">タッチ操作のデフォルト設定</h2>
            <p className="kc-touch-modal-sub">
              この作品をあそぶ人が最初に使うタッチボタンを配置します（config.json に保存されます）。
            </p>
          </div>
          <button type="button" className="kc-icon-btn kc-modal-close" aria-label="閉じる" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="kc-touch-modal-body">
          {/* 左: プレビュー＆ドラッグ配置 */}
          <div className="kc-touch-preview-col">
            <div className="kc-touch-preview-bar">
              <label className="kc-touch-check">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                プレイ開始時にタッチ操作を有効にする
              </label>
              <label className="kc-touch-aspect">
                <span>画面比率</span>
                <select value={aspect} onChange={(e) => changeAspectPreset(e.target.value)} aria-label="プレビューの画面比率プリセット">
                  {!ASPECT_OPTIONS.some((opt) => opt.id === aspect) && (
                    <option value={aspect}>カスタム ({aspectWidth}:{aspectHeight})</option>
                  )}
                  {ASPECT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>幅 : 高さ</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={aspectWidth}
                  onChange={(e) => changeAspectPart("width", e.target.value)}
                  onBlur={resetAspectDraft}
                  aria-label="画面比率の幅"
                  style={{ width: 64, minWidth: 0 }}
                />
                <span>:</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={aspectHeight}
                  onChange={(e) => changeAspectPart("height", e.target.value)}
                  onBlur={resetAspectDraft}
                  aria-label="画面比率の高さ"
                  style={{ width: 64, minWidth: 0 }}
                />
              </div>
            </div>

            <div
              className="kc-touch-preview-mode"
              style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "8px 0" }}
            >
              <span style={{ fontSize: 12, opacity: 0.8, marginRight: 2 }}>プレビュー操作</span>
              <button
                type="button"
                className={`kc-btn ${!testMode ? "kc-run" : "kc-btn-muted"}`}
                aria-pressed={!testMode}
                onClick={() => {
                  releaseAllTestPresses();
                  dragRef.current = null;
                  setTestMode(false);
                }}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                配置
              </button>
              <button
                type="button"
                className={`kc-btn ${testMode ? "kc-run" : "kc-btn-muted"}`}
                aria-pressed={testMode}
                onClick={() => {
                  dragRef.current = null;
                  setTestMode(true);
                  setTestMessage("ボタンを押している間、割り当てた入力を送ります。");
                }}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                テスト
              </button>
              <span style={{ fontSize: 11, opacity: 0.75 }}>
                {testMode ? "押している間だけ入力されます" : "ボタンをドラッグして位置を調整します"}
              </span>
            </div>

            <div className="kc-touch-stage-wrap">
              <div
                className={`kc-touch-stage${!enabled && !testMode ? " is-disabled" : ""}`}
                style={{ aspectRatio: aspect }}
                aria-label="タッチボタン配置プレビュー"
              >
                {previewImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="kc-touch-stage-bg" src={previewImage} alt="" aria-hidden="true" />
                )}
                {areas.length === 0 ? (
                  <p className="kc-touch-stage-empty">
                    右の「＋ 当たり判定を追加」やプリセットの「ロード」でボタンを配置できます。
                  </p>
                ) : (
                  areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      className={`kc-touch-preview-btn${selectedId === area.id ? " is-selected" : ""}${pressedAreaIds.includes(area.id) ? " is-pressed" : ""}`}
                      style={{
                        left: `${area.x}%`,
                        top: `${area.y}%`,
                        width: `${area.w}%`,
                        height: `${area.h}%`,
                        backgroundColor: colorWithOpacity(area.color, area.opacity / 100),
                        touchAction: "none",
                        transform: pressedAreaIds.includes(area.id) ? "scale(0.96)" : undefined,
                        filter: pressedAreaIds.includes(area.id) ? "brightness(1.25)" : undefined,
                        boxShadow: pressedAreaIds.includes(area.id)
                          ? "inset 0 2px 8px rgba(0, 0, 0, 0.35)"
                          : undefined,
                      }}
                      aria-label={`${area.label} (${actionLabel(area)})`}
                      aria-pressed={pressedAreaIds.includes(area.id)}
                      onPointerDown={(event) => (testMode ? beginTestPress(event, area) : beginDrag(event, area))}
                      onPointerMove={testMode ? undefined : moveDrag}
                      onPointerUp={testMode ? endTestPress : endDrag}
                      onPointerCancel={testMode ? endTestPress : endDrag}
                      onLostPointerCapture={testMode ? endTestPress : endDrag}
                      onContextMenu={(event) => {
                        if (testMode) event.preventDefault();
                      }}
                    >
                      <span>{area.label}</span>
                      <small>{actionLabel(area)}</small>
                    </button>
                  ))
                )}
              </div>
            </div>

            <p className="kc-touch-modal-note" aria-live="polite">
              {testMode
                ? `${testMessage}（${areas.length}/${MAX_AREAS} 個）`
                : `プレビュー上のボタンをドラッグして位置を動かせます（${areas.length}/${MAX_AREAS} 個）。`}
            </p>
          </div>

          {/* 右: ボタン追加・プリセット・詳細設定 */}
          <div className="kc-touch-config-col">
            <div className="kc-touch-toolbar">
              <button
                type="button"
                className="kc-btn kc-run"
                onClick={addArea}
                disabled={areas.length >= MAX_AREAS}
              >
                ＋ 当たり判定を追加
              </button>
              <button type="button" className="kc-btn kc-btn-muted" onClick={copySelected} disabled={!selected}>
                ⧉ コピー
              </button>
              <button
                type="button"
                className="kc-btn kc-btn-muted"
                onClick={pasteArea}
                disabled={!clipboardArea || areas.length >= MAX_AREAS}
              >
                ▣ 貼り付け
              </button>
            </div>

            <div className="kc-touch-preset-box">
              <div className="kc-touch-preset-row">
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  aria-label="保存済みの共通設定"
                >
                  <option value="">プリセットを選択…</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="kc-btn kc-btn-muted"
                  onClick={loadPreset}
                  disabled={!presets.some((preset) => preset.id === selectedPresetId)}
                >
                  ロード
                </button>
              </div>
              <div className="kc-touch-preset-row">
                <input
                  value={presetName}
                  maxLength={24}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="共通設定の名前"
                  aria-label="共通設定の名前"
                />
                <button
                  type="button"
                  className="kc-btn kc-btn-blue"
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                >
                  共通保存
                </button>
              </div>
            </div>

            {areas.length === 0 ? (
              <p className="kc-empty">当たり判定がまだありません。</p>
            ) : (
              <div className="kc-touch-editor-grid">
                <div className="kc-touch-btn-list" aria-label="当たり判定一覧">
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
                  <div className="kc-touch-fields">
                    <label className="kc-field">
                      <span>表示名</span>
                      <input
                        value={selected.label}
                        maxLength={16}
                        onChange={(e) => updateSelected({ label: e.target.value })}
                      />
                    </label>
                    <label className="kc-field">
                      <span>割り当て</span>
                      <select
                        value={selected.kind}
                        onChange={(e) =>
                          updateSelected({
                            kind: e.target.value as TouchArea["kind"],
                            value: e.target.value === "mouse" ? "left" : " ",
                          })
                        }
                      >
                        <option value="key">キーボード</option>
                        <option value="mouse">マウス</option>
                      </select>
                    </label>
                    {selected.kind === "key" ? (
                      <label className="kc-field">
                        <span>キー</span>
                        <input
                          value={keyLabel(selected.value)}
                          maxLength={32}
                          placeholder="例: Space / ArrowUp / z"
                          onChange={(e) =>
                            updateSelected({ value: e.target.value === "Space" ? " " : e.target.value })
                          }
                        />
                      </label>
                    ) : (
                      <label className="kc-field">
                        <span>マウスボタン</span>
                        <select
                          value={selected.value}
                          onChange={(e) => updateSelected({ value: e.target.value })}
                        >
                          <option value="left">左クリック</option>
                          <option value="middle">中クリック</option>
                          <option value="right">右クリック</option>
                        </select>
                      </label>
                    )}

                    <div className="kc-touch-numbers">
                      <label className="kc-field">
                        <span>X (%)</span>
                        <input
                          type="number"
                          min="0"
                          max={100 - selected.w}
                          value={Math.round(selected.x)}
                          onChange={(e) => updateSelected({ x: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <label className="kc-field">
                        <span>Y (%)</span>
                        <input
                          type="number"
                          min="0"
                          max={100 - selected.h}
                          value={Math.round(selected.y)}
                          onChange={(e) => updateSelected({ y: Number(e.target.value) || 0 })}
                        />
                      </label>
                      <label className="kc-field">
                        <span>幅 (%)</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={sizeDrafts?.id === selected.id ? sizeDrafts.w : String(Math.round(selected.w))}
                          onChange={(e) =>
                            setSizeDrafts((draft) => ({
                              id: selected.id,
                              w: e.target.value,
                              h: draft?.id === selected.id ? draft.h : String(Math.round(selected.h)),
                            }))
                          }
                          onBlur={(e) => commitSize("w", e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                      </label>
                      <label className="kc-field">
                        <span>高さ (%)</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={sizeDrafts?.id === selected.id ? sizeDrafts.h : String(Math.round(selected.h))}
                          onChange={(e) =>
                            setSizeDrafts((draft) => ({
                              id: selected.id,
                              w: draft?.id === selected.id ? draft.w : String(Math.round(selected.w)),
                              h: e.target.value,
                            }))
                          }
                          onBlur={(e) => commitSize("h", e.currentTarget.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                        />
                      </label>
                    </div>

                    <div className="kc-touch-appearance">
                      <label className="kc-field">
                        <span>ボタン色</span>
                        <input
                          type="color"
                          value={selected.color}
                          onChange={(e) => updateSelected({ color: e.target.value })}
                        />
                      </label>
                      <label className="kc-field kc-touch-opacity">
                        <span>不透明度 ({selected.opacity}%)</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={selected.opacity}
                          onChange={(e) => updateSelected({ opacity: Number(e.target.value) })}
                        />
                      </label>
                    </div>

                    <button type="button" className="kc-btn kc-stop kc-touch-delete" onClick={removeSelected}>
                      削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="kc-touch-modal-foot">
          <button
            type="button"
            className="kc-btn kc-btn-muted"
            onClick={() => {
              setAreas([]);
              setEnabled(true);
              setSelectedId(null);
            }}
            disabled={areas.length === 0 && enabled}
          >
            すべてクリア
          </button>
          <div className="kc-touch-modal-foot-right">
            <button type="button" className="kc-btn kc-btn-muted" onClick={onClose}>
              キャンセル
            </button>
            <button type="button" className="kc-btn kc-run" onClick={handleSave}>
              保存して閉じる
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
