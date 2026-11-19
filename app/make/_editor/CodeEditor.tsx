"use client";

import { useMemo } from "react";
import { highlight } from "./highlight";
import type { CodeEditorApi } from "./useCodeEditor";
import { useLocale } from "@/app/_components/LocaleProvider";

export type EditorTab = { id: string; label: string; closable: boolean };

type Props = {
  code: string; // いま開いているファイルの中身
  editor: CodeEditorApi; // useCodeEditor の戻り値(キー操作などの中身はそちら)
  tabs: EditorTab[]; // 開いているファイル(main.code と、コードファイル)
  activeTab: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
};


// コードを書く場所: 行番号・色分け・入力欄・入力候補
export default function CodeEditor({
  code,
  tabs,
  activeTab,
  onSelectTab,
  onCloseTab,
  editor: {
    gutterRef,
    hlRef,
    editorRef,
    suggest,
    runFormat,
    onInput,
    onCompositionEnd,
    onKeyDown,
    closeSuggest,
    syncScroll,
    updateCursor,
    acceptSuggest,
  },
}: Props) {
  const { t } = useLocale();
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const highlighted = useMemo(() => highlight(code), [code]);

  return (
    <section className="kc-editor" aria-label={t.editor.codeEditor.sectionAria}>
      <div className="kc-tabs" role="tablist">
        {tabs.map((tab) => (
          <div key={tab.id} className={`kc-tab${tab.id === activeTab ? " is-active" : ""}`}>
            <button
              className="kc-tab-main"
              role="tab"
              aria-selected={tab.id === activeTab}
              title={tab.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="kc-dot" />
              {tab.label}
            </button>
            {tab.closable && (
              <button
                className="kc-tab-close"
                aria-label={t.editor.codeEditor.closeTabAria(tab.label)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onCloseTab(tab.id)}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          className="kc-btn kc-tool"
          title={t.editor.codeEditor.formatTitle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={runFormat}
        >
          {t.editor.codeEditor.formatBtn}
        </button>
      </div>
      <div className="kc-code">
        <div className="kc-gutter" aria-hidden="true">
          <div className="kc-gutter-in" ref={gutterRef}>
            {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
          </div>
        </div>
        <div className="kc-area">
          <pre className="kc-hl" aria-hidden="true">
            <span className="kc-hl-in" ref={hlRef}>
              {highlighted}
            </span>
          </pre>
          <textarea
            id="codeEdittor"
            ref={editorRef}
            className="kc-input"
            value={code}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label={t.editor.codeEditor.textareaAria}
            onChange={onInput}
            onCompositionEnd={onCompositionEnd}
            onKeyDown={onKeyDown}
            onBlur={closeSuggest}
            onMouseDown={closeSuggest}
            onScroll={syncScroll}
            onSelect={updateCursor}
          />
          {suggest && (
            <ul
              className="kc-suggest"
              role="listbox"
              aria-label={t.editor.codeEditor.suggestAria}
              style={{ left: suggest.x, top: suggest.y }}
              ref={(el) => el?.querySelector(".is-on")?.scrollIntoView({ block: "nearest" })}
            >
              {suggest.items.map((c, i) => (
                <li
                  key={c.label}
                  role="option"
                  aria-selected={i === suggest.index}
                  className={i === suggest.index ? "is-on" : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault(); // 入力欄からフォーカスを外さない
                    acceptSuggest(c);
                  }}
                >
                  <span className={`kc-sg-kind k-${c.kind}`} aria-hidden="true" />
                  <span className="kc-sg-label">{c.label}</span>
                  <span className="kc-sg-detail">{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}