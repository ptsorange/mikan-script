import { actionLabel, MAX_AREAS } from "@/lib/touchControls";
import AreaFields from "./AreaFields";
import PresetBox from "./PresetBox";
import type { AreaEditor } from "./useAreaEditor";
import type { PresetState } from "./usePresets";

type Props = {
  editor: AreaEditor;
  presetState: PresetState;
  removeSelected: () => void;
};

/** 右: ボタンの追加・コピー、共通設定、選んでいるボタンの詳細設定 */
export default function ConfigColumn({ editor, presetState, removeSelected }: Props) {
  const {
    areas,
    selected,
    selectedId,
    setSelectedId,
    clipboardArea,
    sizeDrafts,
    setSizeDrafts,
    updateSelected,
    commitSize,
    addArea,
    copySelected,
    pasteArea,
  } = editor;

  return (
    <div className="kc-touch-config-col">
      <div className="kc-touch-toolbar">
        <button
          type="button"
          className="kc-btn kc-run"
          onClick={addArea}
          disabled={areas.length >= MAX_AREAS}
        >
          ＋ 当たり判定を追加
        </button>
        <button type="button" className="kc-btn kc-btn-muted" onClick={copySelected} disabled={!selected}>
          ⧉ コピー
        </button>
        <button
          type="button"
          className="kc-btn kc-btn-muted"
          onClick={pasteArea}
          disabled={!clipboardArea || areas.length >= MAX_AREAS}
        >
          ▣ 貼り付け
        </button>
      </div>

      <PresetBox presetState={presetState} />

      {areas.length === 0 ? (
        <p className="kc-empty">当たり判定がまだありません。</p>
      ) : (
        <div className="kc-touch-editor-grid">
          <div className="kc-touch-btn-list" aria-label="当たり判定一覧">
            {areas.map((area) => (
              <button
                key={area.id}
                type="button"
                className={selectedId === area.id ? "is-active" : ""}
                onClick={() => setSelectedId(area.id)}
              >
                <span>{area.label}</span>
                <small>{actionLabel(area)}</small>
              </button>
            ))}
          </div>

          {selected && (
            <AreaFields
              selected={selected}
              sizeDrafts={sizeDrafts}
              setSizeDrafts={setSizeDrafts}
              updateSelected={updateSelected}
              commitSize={commitSize}
              removeSelected={removeSelected}
            />
          )}
        </div>
      )}
    </div>
  );
}
