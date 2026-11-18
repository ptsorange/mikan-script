import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
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

type Params = {
  areas: TouchArea[];
  setAreas: Dispatch<SetStateAction<TouchArea[]>>;
  setSelectedId: (id: string | null) => void;
};

/** 「共通設定(プリセット)」を、保存したり読み込んだりする。ブラウザに保存される */
export function usePresets({ areas, setAreas, setSelectedId }: Params) {
  const [presets, setPresets] = useState<TouchPreset[]>(() => BUILTIN_PRESETS);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  const [presetName, setPresetName] = useState("アクション操作");
  const [selectedPresetId, setSelectedPresetId] = useState(BUILTIN_PRESETS[0].id);

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

  return { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset };
}

export type PresetState = ReturnType<typeof usePresets>;
