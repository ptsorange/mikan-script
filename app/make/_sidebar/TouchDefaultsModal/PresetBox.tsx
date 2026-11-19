import { presetDisplayName } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import type { PresetState } from "./usePresets";

/** 共通設定(プリセット)の、ロードと保存 */
export default function PresetBox({ presetState }: { presetState: PresetState }) {
  const { locale, t } = useLocale();
  const { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset } = presetState;

  return (
    <div className="kc-touch-preset-box">
      <div className="kc-touch-preset-row">
        <select
          value={selectedPresetId}
          onChange={(e) => setSelectedPresetId(e.target.value)}
          aria-label={t.editor.touchModal.presetSelectAria}
        >
          <option value="">{t.editor.touchModal.presetSelectPlaceholder}</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {presetDisplayName(preset, locale)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="kc-btn kc-btn-muted"
          onClick={loadPreset}
          disabled={!presets.some((preset) => preset.id === selectedPresetId)}
        >
          {t.editor.touchModal.presetLoad}
        </button>
      </div>
      <div className="kc-touch-preset-row">
        <input
          value={presetName}
          maxLength={24}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder={t.editor.touchModal.presetNamePlaceholder}
          aria-label={t.editor.touchModal.presetNameAria}
        />
        <button
          type="button"
          className="kc-btn kc-btn-blue"
          onClick={savePreset}
          disabled={!presetName.trim()}
        >
          {t.editor.touchModal.presetSave}
        </button>
      </div>
    </div>
  );
}
