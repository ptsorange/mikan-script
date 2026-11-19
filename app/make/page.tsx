"use client";

import { useCallback, useMemo, useRef, useState, type CSSProperties } from "react";
import { dataUrlToText, KINDS } from "@/lib/mks";
import { useLocale } from "@/app/_components/LocaleProvider";
import "./editor.css";
import { useCode } from "./_hooks/useCode";
import { useSoundPreview } from "./_hooks/useSoundPreview";
import { useAssets } from "./_hooks/useAssets";
import { useProjectInfo } from "./_hooks/useProjectInfo";
import { useProjectIO } from "./_hooks/useProjectIO";
import { useSidebarResize } from "./_hooks/useSidebarResize";
import { useCodeEditor } from "./_editor/useCodeEditor";
import CodeEditor, { type EditorError, type EditorTab } from "./_editor/CodeEditor";
import Stage, { type StageHandle } from "./_stage/Stage";
import TopBar from "./_components/TopBar";
import StatusBar from "./_components/StatusBar";
import type { Panel } from "./_sidebar/panels";
import ActivityBar from "./_sidebar/ActivityBar";
import ExplorerPanel from "./_sidebar/ExplorerPanel";
import BlockPanel from "./_sidebar/BlockPanel";
import InfoPanel from "./_sidebar/InfoPanel";
import AssetPanel from "./_sidebar/AssetPanel";
import CodePanel from "./_sidebar/CodePanel";

const MAIN_TAB = "main"; // エディタのタブ: メインのコード(それ以外は code/xxx.code の名前)

/* 画面の組み立てだけをする。それぞれの中身は、次のファイルにある。
     _hooks/    状態と処理(コード・画像と音・作品の情報・.mks の読み書き・幅の変更)
     _editor/   コードエディタ(色分け・キー操作・入力候補)
     _stage/    実行画面とログ
     _sidebar/  サイドバーの各パネル
     _lib/      保存(IndexedDB / localStorage)などの道具 */

export default function Editor() {
  const { t } = useLocale();
  const stageRef = useRef<StageHandle>(null); // 作品を動かす画面
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<Panel | null>("texture"); // 開いているパネル(null = 閉じている)
  const [closed, setClosed] = useState<Record<string, boolean>>({}); // 閉じているフォルダ

  const { sidebarWidth, startResizing } = useSidebarResize(400);
  const { inputCode, setInputCode, updateCode } = useCode();
  const { previewName, stopPreview, togglePreview } = useSoundPreview(setNotice);
  const [tabs, setTabs] = useState<string[]>([MAIN_TAB]); // エディタで開いているファイル
  const [activeTab, setActiveTab] = useState(MAIN_TAB);
  const [codeErrors, setCodeErrors] = useState<Record<string, EditorError[]>>({});
  // コードファイルの名前を変えたら、開いているタブも追いかける
  const onRenamed = useCallback((from: string, to: string) => {
    setTabs((t) => t.map((x) => (x === from ? to : x)));
    setActiveTab((a) => (a === from ? to : a));
  }, []);
  const {
    assets,
    setAssets,
    byKind,
    saveAssets,
    onAddFiles,
    createCode,
    updateText,
    editing,
    draft,
    setDraft,
    startRename,
    cancelRename,
    commitRename,
    removeAsset,
  } = useAssets({ setNotice, previewName, stopPreview, onRenamed });
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
    setCodeErrors({});
    stageRef.current?.run(inputCode, assets);
  };

  // 消されたコードファイルのタブは出さない(開いているのが消えたら、メインのコードにもどる)
  const openTabs = tabs.filter((t) => t === MAIN_TAB || assets.some((a) => a.name === t));
  const activeAsset = activeTab === MAIN_TAB ? null : (assets.find((a) => a.name === activeTab) ?? null);
  const shownTab = activeAsset ? activeTab : MAIN_TAB;
  const activeData = activeAsset?.data;
  const moduleText = useMemo(() => (activeData === undefined ? "" : dataUrlToText(activeData)), [activeData]);
  const editorCode = activeAsset ? moduleText : inputCode;

  const editorTabs: EditorTab[] = openTabs.map((t) => ({
    id: t,
    label: t === MAIN_TAB ? "main.code" : t.slice(KINDS.code.prefix.length),
    closable: t !== MAIN_TAB,
  }));

  const openFile = (name: string | null) => {
    const id = name ?? MAIN_TAB;
    setTabs((t) => (t.includes(id) ? t : [...t, id]));
    setActiveTab(id);
  };
  const closeTab = (id: string) => {
    setTabs((t) => t.filter((x) => x !== id));
    if (activeTab === id) setActiveTab(MAIN_TAB);
  };

  const activeFileKey = activeAsset ? activeAsset.name : "main.code";

  const clearErrorsForFile = useCallback((fileKey: string) => {
    setCodeErrors((prev) => {
      if (!(fileKey in prev)) return prev;
      const next = { ...prev };
      delete next[fileKey];
      return next;
    });
  }, []);

  const handleStageError = useCallback((err: { file?: string; line?: number; message: string }) => {
    if (!err.line) return;
    const key = err.file || "main.code";
    const entry: EditorError = { line: err.line, message: err.message };
    setCodeErrors((prev) => {
      const list = prev[key] ?? [];
      if (list.some((x) => x.line === entry.line && x.message === entry.message)) return prev;
      return { ...prev, [key]: [...list, entry] };
    });
  }, []);

  const editor = useCodeEditor({
    code: editorCode,
    onCodeChange: (v) => {
      clearErrorsForFile(activeFileKey);
      if (activeAsset) updateText(activeAsset.name, v);
      else updateCode(v);
    },
    assets,
    onRun: runCode,
    // Ctrl + クリックで、import したコードファイルの定義へ飛ぶ(ファイルを開いて、その名前を選ぶ)
    onOpenDefinition: (file, line, col, length) => {
      if (!assets.some((a) => a.name === file)) return;
      openFile(file);
      editor.jumpToLine(line, length > 0 ? { col, length } : undefined);
    },
  });

  const jumpToLocation = (file: string, line: number) => {
    if (file === "main.code") {
      openFile(null);
      editor.jumpToLine(line);
    } else if (assets.some((a) => a.name === file)) {
      openFile(file);
      editor.jumpToLine(line);
    }
  };

  // 新しいコードファイルを作って、エディタで開く(名前はそのまま変えられる)
  const createCodeFile = async () => {
    const name = await createCode();
    if (!name) return;
    openFile(name);
    startRename(name);
  };

  // import の行を、メインのコードの先頭に入れる(すでにあれば入れない)
  const insertImport = (name: string) => {
    const base = name.slice(KINDS.code.prefix.length).replace(/\.code$/i, "");
    const line = `import ${base} "/${name}"`;
    if (inputCode.split("\n").some((l) => l.trim() === line)) {
      setNotice("");
      openFile(null);
      return;
    }
    // import は、ブロックの外(いちばん上)に書くもの。メインのコードの先頭に足す
    updateCode(line + "\n" + inputCode);
    openFile(null);
    setNotice("");
  };

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
        style={{ "--sidebar-w": `${sidebarWidth}px` } as CSSProperties}
      >
        <ActivityBar panel={panel} onSelect={clickActivity} />

        <aside className={`kc-explorer${panel ? "" : " is-closed"}`} aria-label={t.editor.sidebarAria}>
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
              onOpenFile={openFile}
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
              onCapturePreview={() => stageRef.current?.capture()}
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
          {panel === "code" && (
            <CodePanel
              files={byKind.code}
              activeName={activeAsset ? activeTab : null}
              editing={editing}
              draft={draft}
              onDraftChange={setDraft}
              onStartRename={startRename}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
              onRemove={removeAsset}
              onOpen={(name) => {
                openFile(name);
                editor.editorRef.current?.focus();
              }}
              onInsertImport={insertImport}
              onCreate={createCodeFile}
              onAddFiles={onAddFiles("code")}
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

        <CodeEditor
          code={editorCode}
          editor={editor}
          tabs={editorTabs}
          activeTab={shownTab}
          errors={codeErrors[activeFileKey]}
          onDismissErrors={() => clearErrorsForFile(activeFileKey)}
          onSelectTab={setActiveTab}
          onCloseTab={closeTab}
        />
        <Stage
          ref={stageRef}
          onRun={runCode}
          onNotice={setNotice}
          onError={handleStageError}
          onJumpToLocation={jumpToLocation}
        />
      </div>

      <StatusBar
        cursor={editor.cursor}
        textureCount={byKind.texture.length}
        soundCount={byKind.sound.length}
        codeCount={byKind.code.length}
      />
    </div>
  );
}
