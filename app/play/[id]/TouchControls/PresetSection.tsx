import type { PresetState } from "./usePresets";

/** 共通設定(プリセット)の名前・保存・ロード */
export default function PresetSection({ presetState }: { presetState: PresetState }) {
  const { presets, presetName, setPresetName, selectedPresetId, setSelectedPresetId, savePreset, loadPreset } = presetState;

  return (
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
  );
}
