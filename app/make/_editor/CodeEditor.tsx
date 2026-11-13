"use client";

import { useMemo } from "react";
import { highlight } from "./highlight";
import type { CodeEditorApi } from "./useCodeEditor";

type Props = {
  code: string;
  editor: CodeEditorApi; // useCodeEditor の戻り値(キー操作などの中身はそちら)
};


// コードを書く場所: 行番号・色分け・入力欄・入力候補
export default function CodeEditor({
  code,
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
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const highlighted = useMemo(() => highlight(code), [code]);

  return (
    <section className="kc-editor" aria-label="プログラム">
      <div className="kc-tabs">
        <div className="kc-tab">
          <span className="kc-dot" />
          main.code
        </div>
        <button
          className="kc-btn kc-tool"
          title="コードを整える(Shift + Alt + F)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={runFormat}
        >
          ✨ 整形
        </button>
      </div>
      <div className="kc-code">
        <div className="kc-gutter" ref={gutterRef} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
        </div>
        <div className="kc-area">
          <pre className="kc-hl" ref={hlRef} aria-hidden="true">
            {highlighted}
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
            aria-label="プログラムを書く場所"
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
              aria-label="入力の候補"
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
