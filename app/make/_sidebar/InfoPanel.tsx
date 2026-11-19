"use client";

import { useState, type ChangeEvent } from "react";
import type { Meta } from "@/lib/mks";
import { hasTouchControlsConfig, sanitizeTouchControls } from "@/lib/touchControls";
import { useLocale } from "@/app/_components/LocaleProvider";
import TouchDefaultsModal from "./TouchDefaultsModal";

type Props = {
  meta: Meta;
  thumbnail: string | null;
  onMetaChange: <K extends keyof Meta>(key: K, value: Meta[K]) => void;
  onCapture: () => void;
  onCapturePreview?: () => Promise<string | null> | undefined;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

// 作品の情報: 一覧に出るタイトル・説明・サムネ・デフォルトのタッチ操作(書き出すと config.json と thumbnail.png になる)
export default function InfoPanel({
  meta,
  thumbnail,
  onMetaChange,
  onCapture,
  onCapturePreview,
  onPick,
  onClear,
}: Props) {
  const { t } = useLocale();
  const [touchModalOpen, setTouchModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const touchConfig = meta.touchControls;
  const touchEnabled = touchConfig ? touchConfig.enabled : true;
  const touchAreas = touchConfig?.areas ?? [];
  const hasTouchConfig = hasTouchControlsConfig(touchConfig);

  const openTouchEditor = async () => {
    let shot: string | null = null;
    try {
      shot = (await onCapturePreview?.()) ?? null;
    } catch {
      shot = null;
    }
    setPreviewImage(shot || thumbnail);
    setTouchModalOpen(true);
  };

  return (
    <>
      <h2 className="kc-side-title">{t.editor.info.title}</h2>

      <label className="kc-field">
        <span>{t.editor.info.titleLabel}</span>
        <input
          value={meta.title}
          maxLength={60}
          placeholder={t.editor.info.titlePlaceholder}
          onChange={(e) => onMetaChange("title", e.target.value)}
        />
      </label>
      <label className="kc-field">
        <span>{t.editor.info.descLabel}</span>
        <textarea
          value={meta.description}
          maxLength={200}
          rows={4}
          placeholder={t.editor.info.descPlaceholder}
          onChange={(e) => onMetaChange("description", e.target.value)}
        />
        <span className="kc-count">{meta.description.length} / 200</span>
      </label>

      <div className="kc-field">
        <span>{t.editor.info.thumbLabel}</span>
        <div className="kc-thumb-box">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={t.editor.info.thumbAlt} />
          ) : (
            <p className="kc-empty">{t.editor.info.thumbEmpty}</p>
          )}
        </div>
      </div>
      <button className="kc-add" onClick={onCapture}>
        {t.editor.info.captureBtn}
      </button>
      <label className="kc-add kc-add-sound">
        <input className="kc-sr" type="file" accept="image/*" onChange={onPick} />
        {t.editor.info.pickBtn}
      </label>
      {thumbnail && (
        <button className="kc-add kc-add-sound" onClick={onClear}>
          {t.editor.info.clearBtn}
        </button>
      )}

      <div className="kc-field kc-touch-info-section">
        <span>{t.editor.info.touchLabel}</span>
        <div className="kc-touch-summary">
          <label className="kc-touch-check">
            <input
              type="checkbox"
              checked={touchEnabled}
              onChange={(e) =>
                onMetaChange(
                  "touchControls",
                  sanitizeTouchControls({
                    enabled: e.target.checked,
                    areas: touchAreas,
                  })
                )
              }
            />
            {t.editor.info.touchEnableOnStart}
          </label>
          <p className="kc-touch-summary-text">
            {touchAreas.length > 0
              ? t.editor.info.touchConfigured(touchAreas.length)
              : touchEnabled
                ? t.editor.info.touchEmptyEnabled
                : t.editor.info.touchEmptyDisabled}
          </p>
          {touchAreas.length > 0 && (
            <div className="kc-touch-tags" aria-label={t.editor.info.touchTagsAria}>
              {touchAreas.map((area) => (
                <span key={area.id} className="kc-touch-tag">
                  {area.label || t.editor.info.unnamed}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button type="button" className="kc-add kc-add-code" onClick={openTouchEditor}>
        {touchAreas.length > 0 ? t.editor.info.editTouchBtn : t.editor.info.setupTouchBtn}
      </button>
      {hasTouchConfig && (
        <button
          type="button"
          className="kc-add kc-add-alt"
          onClick={() => onMetaChange("touchControls", undefined)}
        >
          {t.editor.info.removeTouchBtn}
        </button>
      )}

      <p className="kc-tip">
        {t.editor.info.tipBefore1}
        <b>config.json</b>
        {t.editor.info.tipMiddle1}
        <b>thumbnail.png</b>
        {t.editor.info.tipAfter}
      </p>

      {touchModalOpen && (
        <TouchDefaultsModal
          initialConfig={touchConfig}
          previewImage={previewImage}
          onSave={(next) => onMetaChange("touchControls", next)}
          onClose={() => setTouchModalOpen(false)}
        />
      )}
    </>
  );
}
