import type { Dispatch, SetStateAction } from "react";
import { keyLabel, type TouchArea } from "@/lib/touchControls";

type SizeDrafts = { id: string; w: string; h: string } | null;

type Props = {
  selected: TouchArea;
  sizeDrafts: SizeDrafts;
  setSizeDrafts: Dispatch<SetStateAction<SizeDrafts>>;
  updateSelected: (patch: Partial<TouchArea>) => void;
  commitSize: (axis: "w" | "h", raw: string) => void;
  removeSelected: () => void;
};

/** 選んでいるボタンの、表示名・割り当て・位置・大きさ・色 */
export default function AreaFields({ selected, sizeDrafts, setSizeDrafts, updateSelected, commitSize, removeSelected }: Props) {
  return (
    <div className="ms-touch-fields">
      <label>
        表示名
        <input value={selected.label} maxLength={16} onChange={(event) => updateSelected({ label: event.target.value })} />
      </label>
      <label>
        割り当て
        <select
          value={selected.kind}
          onChange={(event) => updateSelected({ kind: event.target.value as TouchArea["kind"], value: event.target.value === "mouse" ? "left" : " " })}
        >
          <option value="key">キーボード</option>
          <option value="mouse">マウス</option>
        </select>
      </label>
      {selected.kind === "key" ? (
        <label>
          キー
          <input
            value={keyLabel(selected.value)}
            maxLength={32}
            placeholder="例: Space / ArrowUp / z"
            onChange={(event) => updateSelected({ value: event.target.value === "Space" ? " " : event.target.value })}
          />
        </label>
      ) : (
        <label>
          マウスボタン
          <select value={selected.value} onChange={(event) => updateSelected({ value: event.target.value })}>
            <option value="left">左クリック</option>
            <option value="middle">中クリック</option>
            <option value="right">右クリック</option>
          </select>
        </label>
      )}
      <div className="ms-touch-numbers">
        <label>X (%)<input type="number" min="0" max={100 - selected.w} value={Math.round(selected.x)} onChange={(event) => updateSelected({ x: Number(event.target.value) || 0 })} /></label>
        <label>Y (%)<input type="number" min="0" max={100 - selected.h} value={Math.round(selected.y)} onChange={(event) => updateSelected({ y: Number(event.target.value) || 0 })} /></label>
        <label>幅 (%)<input
          type="number" min="0" max="100" step="1"
          value={sizeDrafts?.id === selected.id ? sizeDrafts.w : String(Math.round(selected.w))}
          onChange={(event) => setSizeDrafts((draft) => ({
            id: selected.id,
            w: event.target.value,
            h: draft?.id === selected.id ? draft.h : String(Math.round(selected.h)),
          }))}
          onBlur={(event) => commitSize("w", event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        /></label>
        <label>高さ (%)<input
          type="number" min="0" max="100" step="1"
          value={sizeDrafts?.id === selected.id ? sizeDrafts.h : String(Math.round(selected.h))}
          onChange={(event) => setSizeDrafts((draft) => ({
            id: selected.id,
            w: draft?.id === selected.id ? draft.w : String(Math.round(selected.w)),
            h: event.target.value,
          }))}
          onBlur={(event) => commitSize("h", event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
        /></label>
      </div>
      <div className="ms-touch-appearance">
        <label>ボタン色<input type="color" value={selected.color} onChange={(event) => updateSelected({ color: event.target.value })} /></label>
        <label className="ms-touch-opacity">
          不透明度 ({selected.opacity}%)
          <input type="range" min="0" max="100" step="1" value={selected.opacity} onChange={(event) => updateSelected({ opacity: Number(event.target.value) })} />
        </label>
      </div>
      <p className="ms-touch-hint">ボタンをドラッグして移動できます。押している間にボタン領域から指・ポインターが外れると解除され、別のボタンに移動すると切り替わります。</p>
      <button type="button" className="ms-btn ms-btn-red ms-touch-delete" onClick={removeSelected}>
        削除
      </button>
    </div>
  );
}
