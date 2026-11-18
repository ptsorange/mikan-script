import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";

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
  return (
    <div className="ms-touch-panel-actions">
      <button type="button" className="ms-btn ms-btn-green" onClick={addArea} disabled={areas.length >= MAX_AREAS}>
        ＋ 当たり判定を追加
      </button>
      <div className="ms-touch-copy-paste">
        <button type="button" className="ms-btn" onClick={copySelected} disabled={!selected}>
          ⧉ コピー
        </button>
        <button type="button" className="ms-btn" onClick={pasteArea} disabled={!clipboardArea || areas.length >= MAX_AREAS}>
          ▣ 貼り付け
        </button>
        <button type="button" className="ms-btn ms-btn-red ms-touch-close" aria-expanded={open} onClick={togglePanel}>
          ✕ 操作設定を閉じる
        </button>
      </div>
      {hasProjectDefault && (
        <button
          type="button"
          className="ms-btn"
          onClick={resetToProjectDefault}
          disabled={!hasCustomSettings}
        >
          ↺ 作品のデフォルトに戻す
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
        配置を編集
      </label>
    </div>
  );
}
