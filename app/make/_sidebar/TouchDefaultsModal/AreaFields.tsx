import { keyLabel, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import type { AreaEditor } from "./useAreaEditor";

type Props = {
  selected: TouchArea;
  sizeDrafts: AreaEditor["sizeDrafts"];
  setSizeDrafts: AreaEditor["setSizeDrafts"];
  updateSelected: AreaEditor["updateSelected"];
  commitSize: AreaEditor["commitSize"];
  removeSelected: () => void;
};

/** 選んでいるボタンの、表示名・割り当て・位置・大きさ・色 */
export default function AreaFields({ selected, sizeDrafts, setSizeDrafts, updateSelected, commitSize, removeSelected }: Props) {
  const { t } = useLocale();

  return (
    <div className="kc-touch-fields">
      <label className="kc-field">
        <span>{t.touch.fieldLabel}</span>
        <input
          value={selected.label}
          maxLength={16}
          onChange={(e) => updateSelected({ label: e.target.value })}
        />
      </label>
      <label className="kc-field">
        <span>{t.touch.fieldAssign}</span>
        <select
          value={selected.kind}
          onChange={(e) =>
            updateSelected({
              kind: e.target.value as TouchArea["kind"],
              value: e.target.value === "mouse" ? "left" : " ",
            })
          }
        >
          <option value="key">{t.touch.assignKey}</option>
          <option value="mouse">{t.touch.assignMouse}</option>
        </select>
      </label>
      {selected.kind === "key" ? (
        <label className="kc-field">
          <span>{t.touch.fieldKey}</span>
          <input
            value={keyLabel(selected.value)}
            maxLength={32}
            placeholder={t.touch.keyPlaceholder}
            onChange={(e) =>
              updateSelected({ value: e.target.value === "Space" ? " " : e.target.value })
            }
          />
        </label>
      ) : (
        <label className="kc-field">
          <span>{t.touch.fieldMouseButton}</span>
          <select
            value={selected.value}
            onChange={(e) => updateSelected({ value: e.target.value })}
          >
            <option value="left">{t.touch.mouseLeft}</option>
            <option value="middle">{t.touch.mouseMiddle}</option>
            <option value="right">{t.touch.mouseRight}</option>
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
          <span>{t.touch.widthPct}</span>
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
          <span>{t.touch.heightPct}</span>
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
          <span>{t.touch.buttonColor}</span>
          <input
            type="color"
            value={selected.color}
            onChange={(e) => updateSelected({ color: e.target.value })}
          />
        </label>
        <label className="kc-field kc-touch-opacity">
          <span>{t.touch.opacity(selected.opacity)}</span>
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
        {t.touch.delete}
      </button>
    </div>
  );
}
