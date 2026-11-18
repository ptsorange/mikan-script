import { actionLabel, type TouchArea } from "@/lib/touchControls";

type Props = {
  areas: TouchArea[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

/** ボタンの一覧(押すと、そのボタンを選ぶ) */
export default function AreaList({ areas, selectedId, setSelectedId }: Props) {
  return (
    <div className="ms-touch-list" aria-label="当たり判定一覧">
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
  );
}
