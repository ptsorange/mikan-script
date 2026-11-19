import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import AspectControls from "./AspectControls";
import ModeSwitch from "./ModeSwitch";
import PreviewStage from "./PreviewStage";
import type { AspectRatio } from "./useAspectRatio";
import type { PreviewInput } from "./usePreviewInput";

type Props = {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  ratio: AspectRatio;
  areas: TouchArea[];
  selectedId: string | null;
  previewImage: string | null;
  preview: PreviewInput;
};

/** 左: プレビューと、ボタンのドラッグ配置・テスト */
export default function PreviewColumn({ enabled, setEnabled, ratio, areas, selectedId, previewImage, preview }: Props) {
  const { t } = useLocale();
  const { testMode, testMessage, switchToPlacement, switchToTest } = preview;

  return (
    <div className="kc-touch-preview-col">
      <div className="kc-touch-preview-bar">
        <label className="kc-touch-check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t.editor.touchModal.enableOnStart}
        </label>
        <AspectControls ratio={ratio} />
      </div>

      <ModeSwitch testMode={testMode} onSelectPlacement={switchToPlacement} onSelectTest={switchToTest} />

      <PreviewStage
        enabled={enabled}
        aspect={ratio.aspect}
        previewImage={previewImage}
        areas={areas}
        selectedId={selectedId}
        preview={preview}
      />

      <p className="kc-touch-modal-note" aria-live="polite">
        {testMode
          ? t.editor.touchModal.noteTest(testMessage, areas.length, MAX_AREAS)
          : t.editor.touchModal.notePlace(areas.length, MAX_AREAS)}
      </p>
    </div>
  );
}
