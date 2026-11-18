import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";

type Props = {
  touchEnabled: boolean;
  changeTouchEnabled: (enabled: boolean) => void;
  areas: TouchArea[];
};

/** パネルの上: タイトルと「タッチ操作を有効にする」、ボタンの数 */
export default function PanelHead({ touchEnabled, changeTouchEnabled, areas }: Props) {
  return (
    <div className="ms-touch-panel-head">
      <strong>タッチ操作</strong>
      <div className="ms-touch-panel-status">
        <label className="ms-touch-enable-toggle">
          <input
            type="checkbox"
            checked={touchEnabled}
            onChange={(event) => changeTouchEnabled(event.target.checked)}
          />
          タッチ操作を有効にする
        </label>
        <span>{areas.length}/{MAX_AREAS}</span>
      </div>
    </div>
  );
}
