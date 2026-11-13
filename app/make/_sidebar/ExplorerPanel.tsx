"use client";

import type { ChangeEvent } from "react";
import { KINDS, KIND_LIST, type Asset, type Kind, type Meta } from "@/lib/mks";
import type { Panel } from "./panels";
import { assetBytes, fmtSize } from "./utils";

type Props = {
  assets: Asset[];
  byKind: Record<Kind, Asset[]>;
  meta: Meta;
  thumbnail: string | null;
  codeBytes: number;
  closed: Record<string, boolean>; // 閉じているフォルダ
  onToggleFolder: (key: string) => void;
  onShowPanel: (panel: Panel) => void;
  onFocusEditor: () => void;
  onExport: () => void;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
};

// エクスプローラー: 「書き出し」で作られる project.mks (zip) の中身
export default function ExplorerPanel(p: Props) {
  const { assets, byKind, meta, thumbnail, codeBytes, closed } = p;
  const total = codeBytes + assets.reduce((sum, a) => sum + assetBytes(a), 0);
  const hasConfig = !!(meta.title || meta.author || meta.description);
  const rootFiles = (hasConfig ? 1 : 0) + (thumbnail ? 1 : 0);
  const fileCount = 1 + assets.length + rootFiles;

  // フォルダの行(▾ / ▸ で開け閉め)
  const folderRow = (key: string, label: string, count: number) => {
    const open = !closed[key];
    return (
      <div
        className="kc-folder"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => p.onToggleFolder(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            p.onToggleFolder(key);
          }
        }}
      >
        <span className="kc-chev" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        {label}
        <span className="kc-folder-count">{count}</span>
      </div>
    );
  };

  return (
    <>
      <h2 className="kc-side-title">エクスプローラー</h2>

      {folderRow("root", "project.mks", fileCount)}
      {!closed.root && (
        <ul className="kc-files">
          {hasConfig && (
            <li className="kc-file">
              <button className="kc-file-main" title="クリックで作品の情報を開く" onClick={() => p.onShowPanel("info")}>
                <span></span>
                <span>config.json</span>
              </button>
            </li>
          )}
          {thumbnail && (
            <li className="kc-file">
              <button className="kc-file-main" title="クリックで作品の情報を開く" onClick={() => p.onShowPanel("info")}>
                <span></span>
                <span>thumbnail.png</span>
              </button>
            </li>
          )}
          <li>
            {folderRow("code", "code", 1)}
            {!closed.code && (
              <ul className="kc-files">
                <li className="kc-file">
                  <button className="kc-file-main" title="クリックで、エディタにもどる" onClick={p.onFocusEditor}>
                    <span></span>
                    <span>main.mjs</span>
                    <span className="kc-size">{fmtSize(codeBytes)}</span>
                  </button>
                </li>
              </ul>
            )}
          </li>

          {/* 中身があるフォルダだけ出す(zip にも、あるものだけ入るので) */}
          {KIND_LIST.filter((k) => byKind[k].length > 0).map((kind) => (
            <li key={kind}>
              {folderRow(kind, kind, byKind[kind].length)}
              {!closed[kind] && (
                <ul className="kc-files">
                  {byKind[kind].map((a) => (
                    <li key={a.name} className="kc-file">
                      <button
                        className="kc-file-main"
                        title={`クリックで、${kind === "texture" ? "テクスチャ" : "サウンド"}を開く`}
                        onClick={() => p.onShowPanel(kind)}
                      >
                        <span></span>
                        <span>{a.name.slice(KINDS[kind].prefix.length)}</span>
                        <span className="kc-size">{fmtSize(assetBytes(a))}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="kc-tip">
        「書き出し」を押すと、この中身が <b>project.mks</b>(zip)になるよ。ぜんぶで約 {fmtSize(total)}。
      </p>
      <button className="kc-add" onClick={p.onExport}>
        💾 書き出し
      </button>
      <label className="kc-import">
        📂 読み込み
        <input className="kc-sr" type="file" accept=".mks" onChange={p.onImport} />
      </label>
    </>
  );
}
