"use client";

import { useMemo, useRef, useState } from "react";
import "./editor.css";
import { useCode } from "./_hooks/useCode";
import { useSoundPreview } from "./_hooks/useSoundPreview";
import { useAssets } from "./_hooks/useAssets";
import { useProjectInfo } from "./_hooks/useProjectInfo";
import { useProjectIO } from "./_hooks/useProjectIO";
import { useSidebarResize } from "./_hooks/useSidebarResize";
import { useCodeEditor } from "./_editor/useCodeEditor";
import CodeEditor from "./_editor/CodeEditor";
import Stage, { type StageHandle } from "./_stage/Stage";
import TopBar from "./_components/TopBar";
import StatusBar from "./_components/StatusBar";
import type { Panel } from "./_sidebar/panels";
import ActivityBar from "./_sidebar/ActivityBar";
import ExplorerPanel from "./_sidebar/ExplorerPanel";
import BlockPanel from "./_sidebar/BlockPanel";
import InfoPanel from "./_sidebar/InfoPanel";
import AssetPanel from "./_sidebar/AssetPanel";

/* 画面の組み立てだけをする。それぞれの中身は、次のファイルにある。
     _hooks/    状態と処理(コード・画像と音・作品の情報・.mks の読み書き・幅の変更)
     _editor/   コードエディタ(色分け・キー操作・入力候補)
     _stage/    実行画面とログ
     _sidebar/  サイドバーの各パネル
     _lib/      保存(IndexedDB / localStorage)などの道具 */

export default function Editor() {
  const stageRef = useRef<StageHandle>(null); // 作品を動かす画面
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel | null>("texture"); // 開いているパネル(null = 閉じている)
  const [closed, setClosed] = useState<Record<string, boolean>>({}); // 閉じているフォルダ

  const { sidebarWidth, startResizing } = useSidebarResize();
  const { inputCode, setInputCode, updateCode } = useCode();
  const { previewName, stopPreview, togglePreview } = useSoundPreview(setNotice);
  const {
    assets,
    setAssets,
    byKind,
    saveAssets,
    onAddFiles,
    editing,
    draft,
    setDraft,
    startRename,
    cancelRename,
    commitRename,
    removeAsset,
  } = useAssets({ setNotice, previewName, stopPreview });
  const { meta, setMeta, thumbnail, setThumbnail, onMetaChange, saveThumbnail, onPickThumbnail, captureThumbnail } =
    useProjectInfo({ setNotice, capture: () => stageRef.current?.capture() });
  const { exportProject, onImportProject } = useProjectIO({
    inputCode,
    setInputCode,
    updateCode,
    assets,
    setAssets,
    saveAssets,
    meta,
    setMeta,
    thumbnail,
    setThumbnail,
    saveThumbnail,
    stopPreview,
    setNotice,
  });

  // 作品は、隔離された iframe の中で動く(ここのクッキーや保存データには触れない)。
  // 実行のたびに iframe を作りなおすので、前の実行と音は全部消える
  const runCode = () => {
    stopPreview();
    stageRef.current?.run(inputCode, assets);
  };

  const editor = useCodeEditor({ code: inputCode, onCodeChange: updateCode, assets, onRun: runCode });

  const toggleFolder = (key: string) => setClosed((c) => ({ ...c, [key]: !c[key] }));

  // 縦バーのアイコン: 開いているアイコンをもう一度押すと、サイドバーが閉じる
  const showPanel = (next: Panel | null) => {
    if (next !== "sound") stopPreview();
    cancelRename();
    setPanel(next);
  };
  const clickActivity = (id: Panel) => showPanel(panel === id ? null : id);

  const codeBytes = useMemo(() => new Blob([inputCode]).size, [inputCode]);

  return (
    <div className="kc-app">
      <TopBar onExport={exportProject} onImport={onImportProject} />

      <div
        className={`kc-body${panel ? "" : " is-collapsed"}`}
        style={{
          gridTemplateColumns: `48px ${panel ? sidebarWidth : 0}px minmax(0, 1fr) minmax(320px, 440px)`,
        }}
      >
        <ActivityBar panel={panel} onSelect={clickActivity} />

        <aside className={`kc-explorer${panel ? "" : " is-closed"}`} aria-label="サイドバー">
          {panel === "explorer" && (
            <ExplorerPanel
              assets={assets}
              byKind={byKind}
              meta={meta}
              thumbnail={thumbnail}
              codeBytes={codeBytes}
              closed={closed}
              onToggleFolder={toggleFolder}
              onShowPanel={showPanel}
              onFocusEditor={() => editor.editorRef.current?.focus()}
              onExport={exportProject}
              onImport={onImportProject}
            />
          )}
          {panel === "block" && <BlockPanel onPickBlock={editor.insertBlock} />}
          {panel === "info" && (
            <InfoPanel
              meta={meta}
              thumbnail={thumbnail}
              onMetaChange={onMetaChange}
              onCapture={captureThumbnail}
              onPick={onPickThumbnail}
              onClear={() => saveThumbnail(null)}
            />
          )}
          {(panel === "texture" || panel === "sound") && (
            <AssetPanel
              kind={panel}
              files={byKind[panel]}
              editing={editing}
              draft={draft}
              previewName={previewName}
              onDraftChange={setDraft}
              onStartRename={startRename}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
              onRemove={removeAsset}
              onTogglePreview={togglePreview}
              onInsertName={(name) => editor.replaceSelection(`"${name}"`)}
              onAddFiles={onAddFiles(panel)}
            />
          )}
          {panel && notice && (
            <p className="kc-notice" role="alert">
              {notice}
            </p>
          )}

          {/* マウスでドラッグして幅を変えるためのつまみ */}
          <div className="kc-resizer" onMouseDown={startResizing} />
        </aside>

        <CodeEditor code={inputCode} editor={editor} />
        <Stage ref={stageRef} onRun={runCode} onNotice={setNotice} />
      </div>

      <StatusBar cursor={editor.cursor} textureCount={byKind.texture.length} soundCount={byKind.sound.length} />
    </div>
  );
}
