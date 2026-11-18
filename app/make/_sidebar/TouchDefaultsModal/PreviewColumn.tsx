import { MAX_AREAS, type TouchArea } from "@/lib/touchControls";
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
          プレイ開始時にタッチ操作を有効にする
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
          ? `${testMessage}（${areas.length}/${MAX_AREAS} 個）`
          : `プレビュー上のボタンをドラッグして位置を動かせます（${areas.length}/${MAX_AREAS} 個）。`}
      </p>
    </div>
  );
}
