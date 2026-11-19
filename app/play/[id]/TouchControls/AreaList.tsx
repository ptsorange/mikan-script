import { actionLabel, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  areas: TouchArea[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

/** ボタンの一覧(押すと、そのボタンを選ぶ) */
export default function AreaList({ areas, selectedId, setSelectedId }: Props) {
  const { locale, t } = useLocale();

  return (
    <div className="ms-touch-list" aria-label={t.touch.areaListAria}>
      {areas.map((area) => (
        <button
          key={area.id}
          type="button"
          className={selectedId === area.id ? "is-active" : ""}
          onClick={() => setSelectedId(area.id)}
        >
          <span>{area.label}</span>
          <small>{actionLabel(area, locale)}</small>
        </button>
      ))}
    </div>
  );
}
