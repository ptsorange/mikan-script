"use client";

import { useRef, type ChangeEvent } from "react";
import { KINDS, kindOf, type Asset, type Kind } from "@/lib/mks";
import { useLocale } from "@/app/_components/LocaleProvider";

type Props = {
  kind: Exclude<Kind, "code">; // コードファイルは CodePanel
  files: Asset[];
  editing: string | null; // 名前を変えている最中のファイル
  draft: string;
  previewName: string | null; // 試し聞き中の音
  onDraftChange: (v: string) => void;
  onStartRename: (name: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onRemove: (name: string) => void;
  onTogglePreview: (a: Asset) => void;
  onInsertName: (name: string) => void; // 名前をクリック → コードに入れる
  onAddFiles: (e: ChangeEvent<HTMLInputElement>) => void;
};

// テクスチャ / サウンドのパネル
export default function AssetPanel(p: Props) {
  const { t } = useLocale();
  const { kind, files } = p;
  const isTexture = kind === "texture";
  const skipBlur = useRef(false); // Esc で取り消したときに、blur で確定されないようにする

  const renderFile = (a: Asset) => {
    const k = kindOf(a.name) as Kind;
    const label = a.name.slice(KINDS[k].prefix.length);
    const playing = p.previewName === a.name;

    return (
      <li key={a.name} className="kc-file">
        {p.editing === a.name ? (
          <input
            className="kc-rename"
            value={p.draft}
            autoFocus
            spellCheck={false}
            aria-label={t.editor.assets.newNameAria}
            onChange={(e) => p.onDraftChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              p.onCommitRename();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") p.onCommitRename();
              if (e.key === "Escape") {
                skipBlur.current = true;
                p.onCancelRename();
              }
            }}
          />
        ) : (
          <>
            <button
              className="kc-file-main"
              title={t.editor.assets.insertNameTitle}
              onClick={() => p.onInsertName(a.name)}
            >
              {k === "texture" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="kc-thumb" src={a.data} alt="" />
              ) : (
                <span className="kc-snd-ico" aria-hidden="true">
                  🔊
                </span>
              )}
              <span>{label}</span>
            </button>
            {k === "sound" && (
              <button
                className={`kc-icon-btn${playing ? " is-on" : ""}`}
                aria-label={playing ? t.editor.assets.stopAria(a.name) : t.editor.assets.previewAria(a.name)}
                title={playing ? t.editor.assets.stopTitle : t.editor.assets.previewTitle}
                onClick={() => p.onTogglePreview(a)}
              >
                {playing ? "■" : "▶"}
              </button>
            )}
            <button
              className="kc-icon-btn"
              aria-label={t.editor.assets.renameAria(a.name)}
              onClick={() => p.onStartRename(a.name)}
            >
              ✎
            </button>
            <button className="kc-icon-btn" aria-label={t.editor.assets.deleteAria(a.name)} onClick={() => p.onRemove(a.name)}>
              ✕
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <>
      <h2 className="kc-side-title">{isTexture ? t.editor.assets.textureTitle : t.editor.assets.soundTitle}</h2>

      {files.length === 0 ? (
        <p className="kc-empty">{isTexture ? t.editor.assets.emptyTexture : t.editor.assets.emptySound}</p>
      ) : (
        <ul className="kc-files kc-flat">{files.map(renderFile)}</ul>
      )}

      <label className={isTexture ? "kc-add" : "kc-add kc-add-sound"}>
        <input
          className="kc-sr"
          type="file"
          multiple
          accept={isTexture ? "image/png" : "audio/*,.mp3,.wav,.ogg,.m4a"}
          onChange={p.onAddFiles}
        />
        {isTexture ? t.editor.assets.addTexture : t.editor.assets.addSound}
      </label>

      {isTexture ? (
        <p className="kc-tip">
          {t.editor.assets.textureTip}
          <code>{'sprite cat = makeSprite("texture/cat.png", 50, 50)'}</code>
        </p>
      ) : (
        <p className="kc-tip">
          {t.editor.assets.soundTipIntro}
          <code>{'await playSound("sound/bgm.mp3")'}</code>
          {t.editor.assets.soundTipAwait}
          <code>{'playSound("sound/hit.wav")'}</code>
          {t.editor.assets.soundTipFire}
        </p>
      )}
    </>
  );
}
