"use client";

import { useState } from "react";
import { sanitizeTouchControls, type TouchControlsConfig } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import ConfigColumn from "./ConfigColumn";
import PreviewColumn from "./PreviewColumn";
import { useAreaEditor } from "./useAreaEditor";
import { useAspectRatio } from "./useAspectRatio";
import { usePresets } from "./usePresets";
import { usePreviewInput } from "./usePreviewInput";

type Props = {
  initialConfig?: TouchControlsConfig;
  previewImage: string | null;
  onSave: (next: TouchControlsConfig | undefined) => void;
  onClose: () => void;
};

/* 作品情報の「タッチ操作のデフォルト設定」。この作品をあそぶ人が最初に使うタッチボタンを配置する。
   左がプレビュー(ドラッグ配置・テスト)、右が追加・共通設定・詳細設定。 */
export default function TouchDefaultsModal({ initialConfig, previewImage, onSave, onClose }: Props) {
  const { t } = useLocale();
  const [enabled, setEnabled] = useState<boolean>(initialConfig?.enabled ?? true);
  const ratio = useAspectRatio();
  const editor = useAreaEditor(initialConfig);
  const { areas, setAreas, setSelectedId } = editor;
  const presetState = usePresets({ areas, setAreas, setSelectedId });
  const preview = usePreviewInput({ updateArea: editor.updateArea, setSelectedId, onClose });

  const removeSelected = () => {
    if (!editor.selected) return;
    preview.cancelDrag();
    editor.removeArea(editor.selected.id);
  };

  const handleSave = () => {
    onSave(sanitizeTouchControls({ enabled, areas }));
    onClose();
  };

  return (
    <div
      className="kc-modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kc-touch-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kc-touch-modal-title"
      >
        <header className="kc-touch-modal-head">
          <div>
            <h2 id="kc-touch-modal-title">{t.editor.touchModal.title}</h2>
            <p className="kc-touch-modal-sub">{t.editor.touchModal.subtitle}</p>
          </div>
          <button type="button" className="kc-icon-btn kc-modal-close" aria-label={t.editor.touchModal.closeAria} onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="kc-touch-modal-body">
          <PreviewColumn
            enabled={enabled}
            setEnabled={setEnabled}
            ratio={ratio}
            areas={areas}
            selectedId={editor.selectedId}
            previewImage={previewImage}
            preview={preview}
          />
          <ConfigColumn editor={editor} presetState={presetState} removeSelected={removeSelected} />
        </div>

        <footer className="kc-touch-modal-foot">
          <button
            type="button"
            className="kc-btn kc-btn-muted"
            onClick={() => {
              setAreas([]);
              setEnabled(true);
              setSelectedId(null);
            }}
            disabled={areas.length === 0 && enabled}
          >
            {t.editor.touchModal.clearAll}
          </button>
          <div className="kc-touch-modal-foot-right">
            <button type="button" className="kc-btn kc-btn-muted" onClick={onClose}>
              {t.editor.touchModal.cancel}
            </button>
            <button type="button" className="kc-btn kc-run" onClick={handleSave}>
              {t.editor.touchModal.saveAndClose}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
