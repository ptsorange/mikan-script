import { MESSAGES, type Locale } from "@/lib/i18n";

export type MouseButton = "left" | "middle" | "right";

export type TouchArea = {
  id: string;
  label: string;
  kind: "key" | "mouse";
  value: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  color: string;
};

export type TouchPreset = {
  id: string;
  name: string;
  areas: TouchArea[];
};

export type TouchControlsConfig = {
  enabled: boolean;
  areas: TouchArea[];
};

export const MOUSE_BUTTONS: MouseButton[] = ["left", "middle", "right"];
export const MAX_AREAS = 12;
export const MOUSE_LABELS: Record<MouseButton, string> = {
  left: "左クリック",
  middle: "中クリック",
  right: "右クリック",
};

export const PRESETS_STORAGE_KEY = "mikan-script-touch-control-presets:v1";
export const DEFAULT_BUTTON_COLOR = "#2d6bd6";

export const SAMPLE_AREAS: Omit<TouchArea, "id">[] = [
  { label: "←", kind: "key", value: "ArrowLeft", x: 4, y: 78, w: 15, h: 18, opacity: 82, color: "#2563eb" },
  { label: "→", kind: "key", value: "ArrowRight", x: 21, y: 78, w: 15, h: 18, opacity: 82, color: "#2563eb" },
  { label: "JUMP", kind: "key", value: " ", x: 80, y: 78, w: 17, h: 18, opacity: 86, color: "#16a34a" },
  { label: "ATTACK", kind: "key", value: "z", x: 80, y: 58, w: 17, h: 18, opacity: 86, color: "#dc2626" },
  { label: "CLICK", kind: "mouse", value: "left", x: 60, y: 80, w: 17, h: 16, opacity: 78, color: "#7c3aed" },
];

// 初回から通常の保存済みプリセットと同じ一覧に表示する組み込みサンプル。
export const BUILTIN_PRESETS: TouchPreset[] = [
  {
    id: "builtin-side-scroller-v1",
    name: "サンプル：横スクロールアクション",
    areas: SAMPLE_AREAS.map((area, index) => ({ ...area, id: `builtin-side-scroller-${index + 1}` })),
  },
];

export const BUILTIN_PRESET_IDS = new Set(BUILTIN_PRESETS.map((preset) => preset.id));

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const normalizeKey = (key: string) => (key === "Space" || key.toLowerCase() === "space" ? " " : key);

export const keyLabel = (key: string) => (normalizeKey(key) === " " ? "Space" : key);

export const mouseLabel = (button: string, locale: Locale = "ja") => {
  const m = MESSAGES[locale].touch;
  if (button === "left") return m.mouseLeft;
  if (button === "middle") return m.mouseMiddle;
  if (button === "right") return m.mouseRight;
  return MOUSE_LABELS[button as MouseButton] ?? button;
};

export const actionLabel = (area: Pick<TouchArea, "kind" | "value">, locale: Locale = "ja") => {
  const m = MESSAGES[locale].touch;
  return area.kind === "key"
    ? `${m.keyPrefix}: ${keyLabel(area.value)}`
    : `${m.mousePrefix}: ${mouseLabel(area.value, locale)}`;
};

export const presetDisplayName = (preset: TouchPreset, locale: Locale = "ja") =>
  preset.id === BUILTIN_PRESETS[0].id ? MESSAGES[locale].touch.builtinPresetName : preset.name;

export const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

// 不透明度はボタン背景だけに適用し、ラベルや操作名の文字は不透明のままにする。
export function colorWithOpacity(hex: string, opacity: number): string {
  const safeHex = isHexColor(hex) ? hex : DEFAULT_BUTTON_COLOR;
  const value = Number.parseInt(safeHex.slice(1), 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${clamp(opacity, 0, 1)})`;
}

export function createTouchAreaId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sanitizeAreas(value: unknown): TouchArea[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_AREAS).flatMap((item, index): TouchArea[] => {
    if (!item || typeof item !== "object") return [];
    const area = item as Partial<TouchArea>;
    if (
      typeof area.id !== "string" ||
      typeof area.label !== "string" ||
      (area.kind !== "key" && area.kind !== "mouse") ||
      typeof area.value !== "string"
    ) {
      return [];
    }

    const x = Number(area.x);
    const y = Number(area.y);
    const w = Number(area.w);
    const h = Number(area.h);
    if (![x, y, w, h].every(Number.isFinite)) return [];

    const safeW = clamp(w, 0, 100);
    const safeH = clamp(h, 0, 100);
    const opacity = Number(area.opacity);
    const valueForAction =
      area.kind === "mouse"
        ? MOUSE_BUTTONS.includes(area.value as MouseButton)
          ? area.value
          : "left"
        : area.value.slice(0, 32) || " ";

    return [
      {
        id: area.id.slice(0, 80) || `area-${index + 1}`,
        label: area.label.slice(0, 16),
        kind: area.kind,
        value: valueForAction,
        x: clamp(x, 0, 100 - safeW),
        y: clamp(y, 0, 100 - safeH),
        w: safeW,
        h: safeH,
        opacity: Number.isFinite(opacity) ? clamp(opacity, 0, 100) : 58,
        color: isHexColor(area.color) ? area.color : DEFAULT_BUTTON_COLOR,
      },
    ];
  });
}

export function sanitizeTouchControls(raw: unknown): TouchControlsConfig | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { enabled?: unknown; areas?: unknown };
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : true;
  const areas = sanitizeAreas(obj.areas);
  if (areas.length === 0 && enabled) return undefined;
  return { enabled, areas };
}

export function hasTouchControlsConfig(tc?: TouchControlsConfig): boolean {
  return !!tc && (tc.areas.length > 0 || tc.enabled === false);
}

export function sanitizePresets(value: unknown): TouchPreset[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((item): TouchPreset[] => {
    if (!item || typeof item !== "object") return [];
    const preset = item as Partial<TouchPreset>;
    if (typeof preset.id !== "string" || typeof preset.name !== "string" || !Array.isArray(preset.areas)) return [];
    return [
      {
        id: preset.id.slice(0, 80),
        name: preset.name.trim().slice(0, 24) || "Preset",
        areas: sanitizeAreas(preset.areas),
      },
    ];
  });
}

export function withBuiltinPresets(value: unknown): TouchPreset[] {
  const custom = sanitizePresets(value).filter((preset) => !BUILTIN_PRESET_IDS.has(preset.id));
  // 組み込みサンプルを常に先頭に置き、ユーザー保存分は最大19件にする。
  return [...BUILTIN_PRESETS, ...custom].slice(0, 20);
}

/**
 * プレイヤー画面での初期状態を解決する純粋関数。
 * ブラウザ保存値(localStorage)があればそれを優先し、なければ作品のデフォルト設定を使う。
 */
export function resolveTouchControlsState(params: {
  storedAreasRaw: string | null;
  storedEnabledRaw: string | null;
  defaultConfig?: TouchControlsConfig;
}): {
  areas: TouchArea[];
  enabled: boolean;
  hasCustomAreas: boolean;
  hasCustomEnabled: boolean;
} {
  const { storedAreasRaw, storedEnabledRaw, defaultConfig } = params;

  let areas: TouchArea[] = [];
  let hasCustomAreas = false;
  if (storedAreasRaw !== null) {
    hasCustomAreas = true;
    try {
      areas = sanitizeAreas(JSON.parse(storedAreasRaw));
    } catch {
      areas = [];
    }
  } else if (defaultConfig) {
    areas = sanitizeAreas(defaultConfig.areas);
  }

  let enabled: boolean;
  let hasCustomEnabled = false;
  if (storedEnabledRaw !== null) {
    hasCustomEnabled = true;
    enabled = storedEnabledRaw !== "false";
  } else if (defaultConfig) {
    enabled = defaultConfig.enabled;
  } else {
    enabled = true;
  }

  return { areas, enabled, hasCustomAreas, hasCustomEnabled };
}
