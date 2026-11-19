import { useMemo, useRef, useState, type RefObject } from "react";
import {
  findMatches,
  nearestIndex,
  replaceOne,
  buildRegExp,
  wordAt,
  type Edit,
  type FindOptions,
  type Match,
} from "@/lib/editing";

type Params = {
  code: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  applyEdit: (ed: Edit) => void;
  syncScroll: () => void;
  updateCursor: () => void;
};

const DEFAULT_OPTS: FindOptions = { caseSensitive: false, wholeWord: false, regex: false };

// 検索・置換(Ctrl + F / Ctrl + H)。見つけた場所の色づけは、CodeEditor が matches / current を使って描く
export function useFind({ code, editorRef, applyEdit, syncScroll, updateCursor }: Params) {
  const [open, setOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [query, setQueryState] = useState("");
  const [replacement, setReplacement] = useState("");
  const [opts, setOptsState] = useState<FindOptions>(DEFAULT_OPTS);
  const [cur, setCur] = useState(0);
  const [focusTick, setFocusTick] = useState(0); // 増えるたびに検索欄へフォーカス
  const measureCtx = useRef<CanvasRenderingContext2D | null>(null);

  const matches = useMemo(() => (open ? findMatches(code, query, opts) : []), [open, code, query, opts]);
  const current = matches.length ? Math.min(cur, matches.length - 1) : -1;
  const invalid = open && query !== "" && buildRegExp(query, opts) === null;

  // 見つけた場所を選び、見える位置までスクロールする(フォーカスは動かさない)
  const reveal = (m: Match | undefined) => {
    const ta = editorRef.current;
    if (!ta || !m) return;
    ta.setSelectionRange(m.from, m.to);
    const cs = getComputedStyle(ta);
    const lh = parseFloat(cs.lineHeight) || 24;
    const lines = ta.value.slice(0, m.from).split("\n");
    const top = parseFloat(cs.paddingTop) + (lines.length - 1) * lh;
    const viewH = ta.clientHeight - 40;
    if (top < ta.scrollTop || top + lh > ta.scrollTop + viewH) {
      ta.scrollTop = Math.max(0, top - viewH / 2);
    }
    const ctx = (measureCtx.current ??= document.createElement("canvas").getContext("2d"));
    if (ctx) {
      ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
      const x = parseFloat(cs.paddingLeft) + ctx.measureText(lines[lines.length - 1].replace(/\t/g, "  ")).width;
      const w = ctx.measureText(ta.value.slice(m.from, m.to).split("\n")[0]).width;
      if (x < ta.scrollLeft || x + w > ta.scrollLeft + ta.clientWidth - 24) {
        ta.scrollLeft = Math.max(0, x - ta.clientWidth / 2);
      }
    }
    syncScroll();
    updateCursor();
  };

  const goTo = (list: Match[], i: number) => {
    if (!list.length) return;
    const idx = ((i % list.length) + list.length) % list.length;
    setCur(idx);
    reveal(list[idx]);
  };

  // 検索ことば・オプションが変わったら、いまのカーソル以降の最初の一致へ
  const refresh = (q: string, o: FindOptions) => {
    const list = findMatches(code, q, o);
    const idx = nearestIndex(list, editorRef.current?.selectionStart ?? 0);
    setCur(Math.max(0, idx));
    if (idx >= 0) reveal(list[idx]);
  };
  const setQuery = (q: string) => {
    setQueryState(q);
    refresh(q, opts);
  };
  const toggle = (key: keyof FindOptions) => {
    const o = { ...opts, [key]: !opts[key] };
    setOptsState(o);
    refresh(query, o);
  };

  const openFind = (withReplace = false) => {
    const ta = editorRef.current;
    let q = query;
    if (ta) {
      const { selectionStart: s, selectionEnd: e, value: v } = ta;
      if (s !== e && !v.slice(s, e).includes("\n")) q = v.slice(s, e);
      else if (!open) {
        const w = wordAt(v, s);
        if (w) q = v.slice(w[0], w[1]);
      }
    }
    setOpen(true);
    if (withReplace) setShowReplace(true);
    setQueryState(q);
    setFocusTick((n) => n + 1);
    const list = findMatches(code, q, opts);
    const idx = nearestIndex(list, ta ? Math.min(ta.selectionStart, ta.selectionEnd) : 0);
    setCur(Math.max(0, idx));
  };

  const close = () => {
    setOpen(false);
    editorRef.current?.focus();
  };

  const step = (dir: 1 | -1) => {
    if (!open) return openFind();
    if (!matches.length) return;
    // 選んでいる一致があればその次、なければカーソルの位置から
    const ta = editorRef.current;
    const sel = matches.findIndex((m) => ta && m.from === ta.selectionStart && m.to === ta.selectionEnd);
    const base = sel !== -1 ? sel : current;
    goTo(matches, base + dir);
  };

  // 1つ置きかえて、次の一致へ。フォーカスは置換欄に残す
  const withFocusKept = (fn: () => void) => {
    const prev = document.activeElement;
    fn();
    if (prev instanceof HTMLElement && prev !== editorRef.current) prev.focus();
  };

  const replaceCurrent = () => {
    const m = matches[current];
    if (!m) return;
    const text = replaceOne(code, m, query, replacement, opts);
    withFocusKept(() => applyEdit({ from: m.from, to: m.to, text, select: [m.from + text.length, m.from + text.length] }));
    const next = code.slice(0, m.from) + text + code.slice(m.to);
    const list = findMatches(next, query, opts);
    const idx = nearestIndex(list, m.from + text.length);
    requestAnimationFrame(() => goTo(list, Math.max(0, idx)));
  };

  const replaceAll = () => {
    const re = buildRegExp(query, opts);
    if (!re || !matches.length) return;
    const next = opts.regex ? code.replace(re, replacement) : code.replace(re, () => replacement);
    if (next === code) return;
    const caret = Math.min(editorRef.current?.selectionStart ?? 0, next.length);
    withFocusKept(() => applyEdit({ from: 0, to: code.length, text: next, select: [caret, caret] }));
  };

  // Ctrl + D: 単語を選ぶ → もう一度押すと、同じことばの次の場所を選ぶ
  const selectNextOccurrence = () => {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    if (s === e) {
      const w = wordAt(v, s);
      if (w) ta.setSelectionRange(w[0], w[1]);
      updateCursor();
      return;
    }
    const word = v.slice(s, e);
    let i = v.indexOf(word, e);
    if (i === -1) i = v.indexOf(word);
    if (i === -1) return;
    reveal({ from: i, to: i + word.length });
  };

  return {
    open,
    showReplace,
    query,
    replacement,
    opts,
    matches,
    current,
    invalid,
    focusTick,
    setShowReplace,
    setReplacement,
    setQuery,
    toggle,
    openFind,
    close,
    next: () => step(1),
    prev: () => step(-1),
    replaceCurrent,
    replaceAll,
    selectNextOccurrence,
  };
}

export type FindApi = ReturnType<typeof useFind>;
