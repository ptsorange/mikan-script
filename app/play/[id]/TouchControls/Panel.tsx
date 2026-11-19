import type { Dispatch, SetStateAction } from "react";
import type { TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import AreaFields from "./AreaFields";
import AreaList from "./AreaList";
import PanelActions from "./PanelActions";
import PanelHead from "./PanelHead";
import PresetSection from "./PresetSection";
import type { PresetState } from "./usePresets";

type SizeDrafts = { id: string; w: string; h: string } | null;

type Props = {
  touchEnabled: boolean;
  changeTouchEnabled: (enabled: boolean) => void;
  areas: TouchArea[];
  selected: TouchArea | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  clipboardArea: TouchArea | null;
  open: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
  hasProjectDefault: boolean;
  hasCustomSettings: boolean;
  addArea: () => void;
  copySelected: () => void;
  pasteArea: () => void;
  removeSelected: () => void;
  togglePanel: () => void;
  resetToProjectDefault: () => void;
  releaseAll: () => void;
  presetState: PresetState;
  sizeDrafts: SizeDrafts;
  setSizeDrafts: Dispatch<SetStateAction<SizeDrafts>>;
  updateSelected: (patch: Partial<TouchArea>) => void;
  commitSize: (axis: "w" | "h", raw: string) => void;
};

/** タッチ操作の設定パネル(ゲーム画面の下、または上に重ねて出る) */
export default function Panel({
  touchEnabled,
  changeTouchEnabled,
  areas,
  selected,
  selectedId,
  setSelectedId,
  clipboardArea,
  open,
  editing,
  setEditing,
  hasProjectDefault,
  hasCustomSettings,
  addArea,
  copySelected,
  pasteArea,
  removeSelected,
  togglePanel,
  resetToProjectDefault,
  releaseAll,
  presetState,
  sizeDrafts,
  setSizeDrafts,
  updateSelected,
  commitSize,
}: Props) {
  const { t } = useLocale();
  return (
    <section className="ms-touch-panel" aria-label={t.touch.panelAria} onPointerDown={(event) => event.stopPropagation()}>
      <PanelHead touchEnabled={touchEnabled} changeTouchEnabled={changeTouchEnabled} areas={areas} />
      <PanelActions
        areas={areas}
        selected={selected}
        clipboardArea={clipboardArea}
        open={open}
        editing={editing}
        hasProjectDefault={hasProjectDefault}
        hasCustomSettings={hasCustomSettings}
        addArea={addArea}
        copySelected={copySelected}
        pasteArea={pasteArea}
        togglePanel={togglePanel}
        resetToProjectDefault={resetToProjectDefault}
        setEditing={setEditing}
        releaseAll={releaseAll}
      />
      <PresetSection presetState={presetState} />
      {areas.length === 0 ? (
        <p className="ms-touch-empty">{t.touch.empty}</p>
      ) : (
        <div className="ms-touch-editor">
          <AreaList areas={areas} selectedId={selectedId} setSelectedId={setSelectedId} />
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
    </section>
  );
}
