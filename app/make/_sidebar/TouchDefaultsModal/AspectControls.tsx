import { useLocale } from "@/app/_components/LocaleProvider";
import { ASPECT_OPTIONS } from "./constants";
import type { AspectRatio } from "./useAspectRatio";

/** 画面比率の選択と、幅・高さの入力 */
export default function AspectControls({ ratio }: { ratio: AspectRatio }) {
  const { t } = useLocale();
  const { aspect, aspectWidth, aspectHeight, changeAspectPreset, changeAspectPart, resetAspectDraft } = ratio;

  return (
    <>
      <label className="kc-touch-aspect">
        <span>{t.editor.touchModal.aspectLabel}</span>
        <select
          value={aspect}
          onChange={(e) => changeAspectPreset(e.target.value)}
          aria-label={t.editor.touchModal.aspectSelectAria}
        >
          {!ASPECT_OPTIONS.some((opt) => opt.id === aspect) && (
            <option value={aspect}>{t.editor.touchModal.aspectCustom(aspectWidth, aspectHeight)}</option>
          )}
          {ASPECT_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {t.editor.touchModal.aspectOptions[opt.id] ?? opt.label}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>{t.editor.touchModal.aspectWidthHeight}</span>
        <input
          type="number"
          min="0.01"
          step="any"
          value={aspectWidth}
          onChange={(e) => changeAspectPart("width", e.target.value)}
          onBlur={resetAspectDraft}
          aria-label={t.editor.touchModal.aspectWidthAria}
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
          aria-label={t.editor.touchModal.aspectHeightAria}
          style={{ width: 64, minWidth: 0 }}
        />
      </div>
    </>
  );
}
