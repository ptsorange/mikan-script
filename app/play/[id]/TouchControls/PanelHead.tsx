import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  touchEnabled: boolean;
  changeTouchEnabled: (enabled: boolean) => void;
  areas: TouchArea[];
};

/** パネルの上: タイトルと「タッチ操作を有効にする」、ボタンの数 */
export default function PanelHead({ touchEnabled, changeTouchEnabled, areas }: Props) {
  const { t } = useLocale();

  return (
    <div className="ms-touch-panel-head">
      <strong>{t.touch.panelTitle}</strong>
      <div className="ms-touch-panel-status">
        <label className="ms-touch-enable-toggle">
          <input
            type="checkbox"
            checked={touchEnabled}
            onChange={(event) => changeTouchEnabled(event.target.checked)}
          />
          {t.touch.enableLabel}
        </label>
        <span>{areas.length}/{MAX_AREAS}</span>
      </div>
    </div>
  );
}
