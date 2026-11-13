"use client";

import type { ChangeEvent } from "react";
import type { Meta } from "@/lib/mks";

type Props = {
  meta: Meta;
  thumbnail: string | null;
  onMetaChange: (key: keyof Meta, value: string) => void;
  onCapture: () => void;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
};

// 作品の情報: 一覧に出るタイトル・説明・サムネ(書き出すと config.json と thumbnail.png になる)
export default function InfoPanel({ meta, thumbnail, onMetaChange, onCapture, onPick, onClear }: Props) {
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
        <span>作者</span>
        <input
          value={meta.author}
          maxLength={40}
          placeholder="名前"
          onChange={(e) => onMetaChange("author", e.target.value)}
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

      <p className="kc-tip">
        「書き出し」を押すと、<b>config.json</b> と <b>thumbnail.png</b> が project.mks の最上位に保存されます。
        ホームの作品一覧には、この内容が表示されます。先に「▶ 実行」してから設定すると、ゲーム画面をサムネイルにできます。
      </p>
    </>
  );
}
