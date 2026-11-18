import type { PresetState } from "./usePresets";

/** 共通設定(プリセット)の、ロードと保存 */
export default function PresetBox({ presetState }: { presetState: PresetState }) {
  const { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset } = presetState;

  return (
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
  );
}
