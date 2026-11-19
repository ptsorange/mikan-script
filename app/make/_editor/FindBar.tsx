"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useLocale } from "@/app/_components/LocaleProvider";
import type { FindApi } from "./useFind";

// 検索・置換バー(エディタの右上)。Enter で次、Shift + Enter で前、Esc で閉じる
export default function FindBar({ find }: { find: FindApi }) {
  const { t } = useLocale();
  const tt = t.editor.codeEditor.find;
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl + F のたびに検索欄へ移って、ことばを全部選ぶ
  useEffect(() => {
    if (find.focusTick === 0) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [find.focusTick]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>, isReplace: boolean) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 日本語の変換中
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      e.preventDefault();
      find.close();
    } else if (e.key === "Enter" && !mod) {
      e.preventDefault();
      if (isReplace) find.replaceCurrent();
      else if (e.shiftKey) find.prev();
      else find.next();
    } else if (e.key === "Enter" && mod && isReplace) {
      e.preventDefault();
      find.replaceAll();
    } else if (e.key === "F3") {
      e.preventDefault();
      if (e.shiftKey) find.prev();
      else find.next();
    } else if (mod && e.code === "KeyF") {
      e.preventDefault();
      find.openFind(false);
    } else if (mod && e.code === "KeyH") {
      e.preventDefault();
      find.openFind(true);
    } else if (e.altKey && e.code === "KeyC") {
      e.preventDefault();
      find.toggle("caseSensitive");
    } else if (e.altKey && e.code === "KeyW") {
      e.preventDefault();
      find.toggle("wholeWord");
    } else if (e.altKey && e.code === "KeyR") {
      e.preventDefault();
      find.toggle("regex");
    }
  };

  const total = find.matches.length;
  const status = find.invalid ? tt.badRegex : find.query === "" ? "" : total === 0 ? tt.noResults : tt.count(find.current + 1, total);

  return (
    <div className="kc-find" role="search" aria-label={tt.aria}>
      <button
        type="button"
        className={`kc-find-expand${find.showReplace ? " is-on" : ""}`}
        title={tt.toggleReplace}
        aria-expanded={find.showReplace}
        onClick={() => find.setShowReplace(!find.showReplace)}
      >
        ›
      </button>
      <div className="kc-find-rows">
        <div className="kc-find-row">
          <input
            ref={inputRef}
            className={`kc-find-input${find.invalid ? " is-bad" : ""}`}
            value={find.query}
            placeholder={tt.placeholder}
            aria-label={tt.placeholder}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => find.setQuery(e.target.value)}
            onKeyDown={(e) => onKeyDown(e, false)}
          />
          <button
            type="button"
            className={`kc-find-opt${find.opts.caseSensitive ? " is-on" : ""}`}
            title={tt.caseTitle}
            aria-pressed={find.opts.caseSensitive}
            onClick={() => find.toggle("caseSensitive")}
          >
            Aa
          </button>
          <button
            type="button"
            className={`kc-find-opt${find.opts.wholeWord ? " is-on" : ""}`}
            title={tt.wordTitle}
            aria-pressed={find.opts.wholeWord}
            onClick={() => find.toggle("wholeWord")}
          >
            ab
          </button>
          <button
            type="button"
            className={`kc-find-opt${find.opts.regex ? " is-on" : ""}`}
            title={tt.regexTitle}
            aria-pressed={find.opts.regex}
            onClick={() => find.toggle("regex")}
          >
            .*
          </button>
          <span className="kc-find-count" aria-live="polite">
            {status}
          </span>
          <button type="button" className="kc-find-btn" title={tt.prev} aria-label={tt.prev} onClick={find.prev}>
            ↑
          </button>
          <button type="button" className="kc-find-btn" title={tt.next} aria-label={tt.next} onClick={find.next}>
            ↓
          </button>
          <button type="button" className="kc-find-btn" title={tt.close} aria-label={tt.close} onClick={find.close}>
            ✕
          </button>
        </div>
        {find.showReplace && (
          <div className="kc-find-row">
            <input
              className="kc-find-input"
              value={find.replacement}
              placeholder={tt.replacePlaceholder}
              aria-label={tt.replacePlaceholder}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => find.setReplacement(e.target.value)}
              onKeyDown={(e) => onKeyDown(e, true)}
            />
            <button type="button" className="kc-find-txt" title={tt.replaceOneTitle} onClick={find.replaceCurrent}>
              {tt.replaceOne}
            </button>
            <button type="button" className="kc-find-txt" title={tt.replaceAllTitle} onClick={find.replaceAll}>
              {tt.replaceAll}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
