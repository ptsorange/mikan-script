import { useEffect, useState } from "react";
import {
  BUILTIN_PRESETS,
  BUILTIN_PRESET_IDS,
  createTouchAreaId,
  MAX_AREAS,
  PRESETS_STORAGE_KEY,
  sanitizeAreas,
  withBuiltinPresets,
  type TouchArea,
  type TouchPreset,
} from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

type Params = { areas: TouchArea[]; applyAreas: (nextAreas: TouchArea[]) => void };

/** 「共通設定(プリセット)」の保存とロード。このブラウザの、ほかの作品でも使える */
export function usePresets({ areas, applyAreas }: Params) {
  const { t } = useLocale();
  const [presets, setPresets] = useState<TouchPreset[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState(BUILTIN_PRESETS[0].id);
  const presetName = presetNameDraft ?? t.touch.defaultPresetName;
  const setPresetName = (next: string) => setPresetNameDraft(next);

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

  return { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset };
}

export type PresetState = ReturnType<typeof usePresets>;
