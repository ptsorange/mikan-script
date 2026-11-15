"use client";

import { useRef, type ChangeEvent } from "react";
import { KINDS, type Asset } from "@/lib/mks";
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
            aria-label="あたらしい名前"
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
            <button className="kc-file-main" title="クリックで、エディタで開く" onClick={() => p.onOpen(a.name)}>
              <span className="kc-snd-ico kc-ico-code" aria-hidden="true">
                {"</>"}
              </span>
              <span>{label}</span>
              <span className="kc-size">{fmtSize(assetBytes(a))}</span>
            </button>
            <button
              className="kc-icon-btn"
              aria-label={`${a.name} を import する行を、メインのコードに入れる`}
              title="import の行を、メインのコードに入れる"
              onClick={() => p.onInsertImport(a.name)}
            >
              ⤓
            </button>
            <button
              className="kc-icon-btn"
              aria-label={`${a.name} の名前を変える`}
              onClick={() => p.onStartRename(a.name)}
            >
              ✎
            </button>
            <button className="kc-icon-btn" aria-label={`${a.name} を消す`} onClick={() => p.onRemove(a.name)}>
              ✕
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <>
      <h2 className="kc-side-title">コードファイル</h2>

      {p.files.length === 0 ? (
        <p className="kc-empty">まだコードファイルがないよ。下のボタンで作ったり、アップロードしたりしよう。</p>
      ) : (
        <ul className="kc-files kc-flat">{p.files.map(renderFile)}</ul>
      )}

      <button className="kc-add kc-add-code" onClick={p.onCreate}>
        ＋ 新しいコードを作る
      </button>
      <label className="kc-add kc-add-code kc-add-alt">
        <input className="kc-sr" type="file" multiple accept=".code,.txt,.js,.mjs,text/plain" onChange={p.onAddFiles} />
        ⭱ コードをアップロード
      </label>

      <p className="kc-tip">
        ファイルをクリックすると、エディタで開くよ。⤓ を押すと、import の行がメインのコードに入るよ。
        <code>{'import physic "/code/physic.code"'}</code>
        <code>{"physic.spawnBox(10, 10, 10, 10)"}</code>
        ファイルの一番上(ブロックの外)に書いた function / num / text / sprite が、「名前.」のあとで使えるよ。
        値を受け取るときは <b>await</b> をつけてね。
      </p>
    </>
  );
}
