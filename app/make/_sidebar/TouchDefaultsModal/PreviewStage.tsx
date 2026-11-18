import { actionLabel, colorWithOpacity, type TouchArea } from "@/lib/touchControls";
import type { PreviewInput } from "./usePreviewInput";

type Props = {
  enabled: boolean;
  aspect: string;
  previewImage: string | null;
  areas: TouchArea[];
  selectedId: string | null;
  preview: PreviewInput;
};

/** ゲーム画面のプレビュー。この上にタッチボタンを並べる */
export default function PreviewStage({ enabled, aspect, previewImage, areas, selectedId, preview }: Props) {
  const { testMode, pressedAreaIds, beginDrag, moveDrag, endDrag, beginTestPress, endTestPress } = preview;

  return (
    <div className="kc-touch-stage-wrap">
      <div
        className={`kc-touch-stage${!enabled && !testMode ? " is-disabled" : ""}`}
        style={{ aspectRatio: aspect }}
        aria-label="タッチボタン配置プレビュー"
      >
        {previewImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="kc-touch-stage-bg" src={previewImage} alt="" aria-hidden="true" />
        )}
        {areas.length === 0 ? (
          <p className="kc-touch-stage-empty">
            右の「＋ 当たり判定を追加」やプリセットの「ロード」でボタンを配置できます。
          </p>
        ) : (
          areas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={`kc-touch-preview-btn${selectedId === area.id ? " is-selected" : ""}${pressedAreaIds.includes(area.id) ? " is-pressed" : ""}`}
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.w}%`,
                height: `${area.h}%`,
                backgroundColor: colorWithOpacity(area.color, area.opacity / 100),
                touchAction: "none",
                transform: pressedAreaIds.includes(area.id) ? "scale(0.96)" : undefined,
                filter: pressedAreaIds.includes(area.id) ? "brightness(1.25)" : undefined,
                boxShadow: pressedAreaIds.includes(area.id)
                  ? "inset 0 2px 8px rgba(0, 0, 0, 0.35)"
                  : undefined,
              }}
              aria-label={`${area.label} (${actionLabel(area)})`}
              aria-pressed={pressedAreaIds.includes(area.id)}
              onPointerDown={(event) => (testMode ? beginTestPress(event, area) : beginDrag(event, area))}
              onPointerMove={testMode ? undefined : moveDrag}
              onPointerUp={testMode ? endTestPress : endDrag}
              onPointerCancel={testMode ? endTestPress : endDrag}
              onLostPointerCapture={testMode ? endTestPress : endDrag}
              onContextMenu={(event) => {
                if (testMode) event.preventDefault();
              }}
            >
              <span>{area.label}</span>
              <small>{actionLabel(area)}</small>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
