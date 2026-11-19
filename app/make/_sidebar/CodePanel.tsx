"use client";

import { useRef, type ChangeEvent } from "react";
import { KINDS, type Asset } from "@/lib/mks";
import { useLocale } from "@/app/_components/LocaleProvider";
import { fmtSize, assetBytes } from "./utils";

type Props = {
  files: Asset[];
  activeName: string | null; // いまエディタで開いているコードファイル
  editing: string | null; // 名前を変えている最中のファイル
  draft: string;
  onDraftChange: (v: string) => void;
  onStartRename: (name: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onRemove: (name: string) => void;
  onOpen: (name: string) => void; // クリック → エディタで開く
  onInsertImport: (name: string) => void; // import の行を、メインのコードに入れる
  onCreate: () => void;
  onAddFiles: (e: ChangeEvent<HTMLInputElement>) => void;
};

// コードファイルのパネル: 作る・アップロード・開く・名前変更・削除
export default function CodePanel(p: Props) {
  const { t } = useLocale();
  const skipBlur = useRef(false); // Esc で取り消したときに、blur で確定されないようにする

  const renderFile = (a: Asset) => {
    const label = a.name.slice(KINDS.code.prefix.length);
    return (
      <li key={a.name} className={`kc-file${p.activeName === a.name ? " is-active" : ""}`}>
        {p.editing === a.name ? (
          <input
            className="kc-rename"
            value={p.draft}
            autoFocus
            spellCheck={false}
            aria-label={t.editor.codePanel.newNameAria}
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
            <button className="kc-file-main" title={t.editor.codePanel.openTitle} onClick={() => p.onOpen(a.name)}>
              <span className="kc-snd-ico kc-ico-code" aria-hidden="true">
                {"</>"}
              </span>
              <span>{label}</span>
              <span className="kc-size">{fmtSize(assetBytes(a))}</span>
            </button>
            <button
              className="kc-icon-btn"
              aria-label={t.editor.codePanel.insertImportAria(a.name)}
              title={t.editor.codePanel.insertImportTitle}
              onClick={() => p.onInsertImport(a.name)}
            >
              ⤓
            </button>
            <button
              className="kc-icon-btn"
              aria-label={t.editor.codePanel.renameAria(a.name)}
              onClick={() => p.onStartRename(a.name)}
            >
              ✎
            </button>
            <button
              className="kc-icon-btn"
              aria-label={t.editor.codePanel.deleteAria(a.name)}
              onClick={() => p.onRemove(a.name)}
            >
              ✕
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <>
      <h2 className="kc-side-title">{t.editor.codePanel.title}</h2>

      {p.files.length === 0 ? (
        <p className="kc-empty">{t.editor.codePanel.empty}</p>
      ) : (
        <ul className="kc-files kc-flat">{p.files.map(renderFile)}</ul>
      )}

      <button className="kc-add kc-add-code" onClick={p.onCreate}>
        {t.editor.codePanel.createBtn}
      </button>
      <label className="kc-add kc-add-code kc-add-alt">
        <input className="kc-sr" type="file" multiple accept=".code,.txt,.js,.mjs,text/plain" onChange={p.onAddFiles} />
        {t.editor.codePanel.uploadBtn}
      </label>

      <p className="kc-tip">
        {t.editor.codePanel.tipLine1}
        <code>{'import physic "/code/physic.code"'}</code>
        <code>{"physic.spawnBox(10, 10, 10, 10)"}</code>
        {t.editor.codePanel.tipLine2Before}
        <b>{t.editor.codePanel.tipLine2Bold}</b>
        {t.editor.codePanel.tipLine2After}
      </p>
    </>
  );
}
