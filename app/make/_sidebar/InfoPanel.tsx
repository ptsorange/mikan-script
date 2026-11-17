"use client";

import { useState, type ChangeEvent } from "react";
import type { Meta } from "@/lib/mks";
import { hasTouchControlsConfig, sanitizeTouchControls } from "@/lib/touchControls";
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
      <h2 className="kc-side-title">作品の情報</h2>

      <label className="kc-field">
        <span>タイトル</span>
        <input
          value={meta.title}
          maxLength={60}
          placeholder="例: みかん回避ゲーム"
          onChange={(e) => onMetaChange("title", e.target.value)}
        />
      </label>
      <label className="kc-field">
        <span>説明</span>
        <textarea
          value={meta.description}
          maxLength={200}
          rows={4}
          placeholder="ゲームの内容や遊び方"
          onChange={(e) => onMetaChange("description", e.target.value)}
        />
        <span className="kc-count">{meta.description.length} / 200</span>
      </label>

      <div className="kc-field">
        <span>サムネイル</span>
        <div className="kc-thumb-box">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="サムネイル" />
          ) : (
            <p className="kc-empty">未設定</p>
          )}
        </div>
      </div>
      <button className="kc-add" onClick={onCapture}>
        📷 実行画面をサムネイルに設定
      </button>
      <label className="kc-add kc-add-sound">
        <input className="kc-sr" type="file" accept="image/*" onChange={onPick} />
        ＋ 画像を選択
      </label>
      {thumbnail && (
        <button className="kc-add kc-add-sound" onClick={onClear}>
          ✕ サムネイルを削除
        </button>
      )}

      <div className="kc-field kc-touch-info-section">
        <span>タッチ操作（デフォルト）</span>
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
            開始時に有効にする
          </label>
          <p className="kc-touch-summary-text">
            {touchAreas.length > 0
              ? `ボタン ${touchAreas.length} 個を設定済み`
              : touchEnabled
                ? "未設定（ボタンなし）"
                : "未設定（デフォルト無効）"}
          </p>
          {touchAreas.length > 0 && (
            <div className="kc-touch-tags" aria-label="設定済みのボタン">
              {touchAreas.map((area) => (
                <span key={area.id} className="kc-touch-tag">
                  {area.label || "(無名)"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <button type="button" className="kc-add kc-add-code" onClick={openTouchEditor}>
        {touchAreas.length > 0 ? "🎮 タッチ操作を編集" : "🎮 タッチ操作を設定"}
      </button>
      {hasTouchConfig && (
        <button
          type="button"
          className="kc-add kc-add-alt"
          onClick={() => onMetaChange("touchControls", undefined)}
        >
          ✕ タッチ操作設定を削除
        </button>
      )}

      <p className="kc-tip">
        「書き出し」を押すと、<b>config.json</b>（タイトル・説明・タッチ操作設定）と <b>thumbnail.png</b> が
        project.mks の最上位に保存されます。先に「▶ 実行」してから設定すると、ゲーム画面を見ながら配置できます。
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
