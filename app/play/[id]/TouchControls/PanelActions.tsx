import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  areas: TouchArea[];
  selected: TouchArea | null;
  clipboardArea: TouchArea | null;
  open: boolean;
  editing: boolean;
  hasProjectDefault: boolean;
  hasCustomSettings: boolean;
  addArea: () => void;
  copySelected: () => void;
  pasteArea: () => void;
  togglePanel: () => void;
  resetToProjectDefault: () => void;
  setEditing: (editing: boolean) => void;
  releaseAll: () => void;
};

/** 追加・コピー・貼り付け・閉じる・デフォルトに戻す・「配置を編集」 */
export default function PanelActions({
  areas,
  selected,
  clipboardArea,
  open,
  editing,
  hasProjectDefault,
  hasCustomSettings,
  addArea,
  copySelected,
  pasteArea,
  togglePanel,
  resetToProjectDefault,
  setEditing,
  releaseAll,
}: Props) {
  const { t } = useLocale();

  return (
    <div className="ms-touch-panel-actions">
      <button type="button" className="ms-btn ms-btn-green" onClick={addArea} disabled={areas.length >= MAX_AREAS}>
        {t.touch.addArea}
      </button>
      <div className="ms-touch-copy-paste">
        <button type="button" className="ms-btn" onClick={copySelected} disabled={!selected}>
          {t.touch.copy}
        </button>
        <button type="button" className="ms-btn" onClick={pasteArea} disabled={!clipboardArea || areas.length >= MAX_AREAS}>
          {t.touch.paste}
        </button>
        <button type="button" className="ms-btn ms-btn-red ms-touch-close" aria-expanded={open} onClick={togglePanel}>
          {t.touch.closeSettings}
        </button>
      </div>
      {hasProjectDefault && (
        <button
          type="button"
          className="ms-btn"
          onClick={resetToProjectDefault}
          disabled={!hasCustomSettings}
        >
          {t.touch.resetDefault}
        </button>
      )}
      <label className="ms-touch-edit-toggle">
        <input
          type="checkbox"
          checked={editing}
          onChange={(event) => {
            setEditing(event.target.checked);
            if (event.target.checked) releaseAll();
          }}
        />
        {t.touch.editLayout}
      </label>
    </div>
  );
}
