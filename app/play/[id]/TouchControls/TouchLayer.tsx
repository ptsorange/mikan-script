import type { CSSProperties } from "react";
import { actionLabel, colorWithOpacity, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import type { PointerHandlers } from "./usePointerHandlers";

type Props = {
  layerStyle: CSSProperties;
  areas: TouchArea[];
  editing: boolean;
  pointer: PointerHandlers;
};

/** ゲーム画面の上に重ねる、タッチボタンの層 */
export default function TouchLayer({ layerStyle, areas, editing, pointer }: Props) {
  const { locale, t } = useLocale();
  const { beginPress, endPress, moveArea } = pointer;

  return (
    <div className="ms-touch-layer" style={layerStyle} aria-label={t.touch.layerAria}>
      {areas.map((area) => {
        const act = actionLabel(area, locale);
        return (
          <button
            key={area.id}
            type="button"
            className={`ms-touch-area${editing ? " is-editing" : ""}`}
            style={{
              left: `${area.x}%`,
              top: `${area.y}%`,
              width: `${area.w}%`,
              height: `${area.h}%`,
              backgroundColor: colorWithOpacity(area.color, area.opacity / 100),
            }}
            data-area-id={area.id}
            aria-label={`${area.label} (${act})`}
            onPointerDown={(event) => beginPress(event, area)}
            onPointerUp={endPress}
            onPointerCancel={endPress}
            onLostPointerCapture={endPress}
            onPointerMove={moveArea}
            onContextMenu={(event) => event.preventDefault()}
          >
            <span>{area.label}</span>
            <small>{act}</small>
          </button>
        );
      })}
    </div>
  );
}
