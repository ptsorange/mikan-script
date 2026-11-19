import { presetDisplayName } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import type { PresetState } from "./usePresets";

/** 共通設定(プリセット)の名前・保存・ロード */
export default function PresetSection({ presetState }: { presetState: PresetState }) {
  const { locale, t } = useLocale();
  const { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset } = presetState;

  return (
    <div className="ms-touch-presets">
      <label className="ms-touch-preset-name">
        {t.touch.presetNameLabel}
        <input value={presetName} maxLength={24} onChange={(event) => setPresetName(event.target.value)} placeholder={t.touch.presetPlaceholder} />
      </label>
      <div className="ms-touch-preset-actions">
        <button type="button" className="ms-btn ms-btn-blue" onClick={savePreset} disabled={!presetName.trim()}>
          {t.touch.presetSave}
        </button>
      </div>
      <div className="ms-touch-preset-load">
        <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)} aria-label={t.touch.presetSelectAria}>
          <option value="">{t.touch.presetSelectPlaceholder}</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {presetDisplayName(preset, locale)}
            </option>
          ))}
        </select>
        <button type="button" className="ms-btn" onClick={loadPreset} disabled={!presets.some((preset) => preset.id === selectedPresetId)}>
          {t.touch.presetLoad}
        </button>
      </div>
      <p className="ms-touch-hint">{t.touch.presetHint}</p>
    </div>
  );
}
