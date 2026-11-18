import type { CSSProperties } from "react";
import { actionLabel, colorWithOpacity, type TouchArea } from "@/lib/touchControls";
import type { PointerHandlers } from "./usePointerHandlers";

type Props = {
  layerStyle: CSSProperties;
  areas: TouchArea[];
  editing: boolean;
  pointer: PointerHandlers;
};

/** ゲーム画面の上に重ねる、タッチボタンの層 */
export default function TouchLayer({ layerStyle, areas, editing, pointer }: Props) {
  const { beginPress, endPress, moveArea } = pointer;

  return (
    <div className="ms-touch-layer" style={layerStyle} aria-label="タッチ操作">
      {areas.map((area) => (
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
          aria-label={`${area.label} (${actionLabel(area)})`}
          onPointerDown={(event) => beginPress(event, area)}
          onPointerUp={endPress}
          onPointerCancel={endPress}
          onLostPointerCapture={endPress}
          onPointerMove={moveArea}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span>{area.label}</span>
          <small>{actionLabel(area)}</small>
        </button>
      ))}
    </div>
  );
}
