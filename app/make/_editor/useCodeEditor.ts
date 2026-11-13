import type { Block } from "blockly";
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { blockToCode } from "@/lib/blocks";
import {
  typeChar,
  backspace,
  enter,
  tab,
  toggleComment,
  formatCode,
  getCompletions,
  applyCandidate,
  type Edit,
  type Candidate,
} from "@/lib/editing";
import type { Asset } from "@/lib/mks";

// 入力候補(x, y は入力欄の中での位置)
export type Suggest = {
  from: number;
  items: Candidate[];
  index: number;
  typed: string;
  x: number;
  y: number;
  up: boolean;
};

type Params = {
  code: string;
  onCodeChange: (value: string) => void;
  assets: Asset[]; // makeSprite(" のあとに、画像の名前を候補に出す
  onRun: () => void; // Ctrl + Enter
};

// コード入力欄の動き: スクロール同期・カーソル位置・キー操作・入力候補・ブロックの挿入
export function useCodeEditor({ code, onCodeChange, assets, onRun }: Params) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const [suggest, setSuggestState] = useState<Suggest | null>(null);
  const suggestRef = useRef<Suggest | null>(null);
  const skipRefresh = useRef(false);
  const measureCtx = useRef<CanvasRenderingContext2D | null>(null);
  const setSuggest = (v: Suggest | null) => {
    suggestRef.current = v;
    setSuggestState(v);
  };

  const syncScroll = () => {
    const ta = editorRef.current;
    if (!ta) return;
    if (hlRef.current) {
      hlRef.current.scrollTop = ta.scrollTop;
      hlRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
  };

  const updateCursor = () => {
    const ta = editorRef.current;
    if (!ta) return;
    const lines = ta.value.slice(0, ta.selectionStart).split("\n");
    setCursor({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  // カーソルの位置(選んでいる文字は置きかえ)に文字を入れる
  const replaceSelection = (text: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    onCodeChange(code.slice(0, s) + text + code.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + text.length, s + text.length);
      updateCursor();
    });
  };

  // 編集を入力欄に反映する。execCommand を使うので、Ctrl + Z で元にもどせる
  const applyEdit = (ed: Edit) => {
    const ta = editorRef.current;
    if (!ta) return;
    setSuggest(null);
    ta.focus();
    const before = ta.value;
    const expected = before.slice(0, ed.from) + ed.text + before.slice(ed.to);
    if (expected !== before) {
      skipRefresh.current = true;
      ta.setSelectionRange(ed.from, ed.to);
      let ok = false;
      try {
        ok = ed.text ? document.execCommand("insertText", false, ed.text) : document.execCommand("delete");
      } catch {
        ok = false;
      }
      skipRefresh.current = false;
      if (!ok || ta.value !== expected) {
        // execCommand が使えないブラウザ用(この場合は Ctrl + Z の履歴は残らない)
        ta.value = expected;
        onCodeChange(expected);
      }
    }
    ta.setSelectionRange(ed.select[0], ed.select[1]);
    updateCursor();
  };

  // サイドバーで押したブロックを、コードにして入力欄のカーソルの位置に入れる
  const insertBlock = (block: Block) => {
    const ta = editorRef.current;
    if (!ta) return;

    const pos = ta.selectionEnd; // 現在のカーソル位置
    const blockCode = blockToCode(block);

    // カーソルがあるその場所にそのままブロックを挿入する
    const ed: Edit = {
      from: pos,
      to: pos,
      text: blockCode,
      select: [pos + blockCode.length, pos + blockCode.length]
    };

    console.log(ed);
    applyEdit(ed);
    runFormat();
  };

  // 入力候補をつくりなおす
  const refreshSuggest = (force = false) => {
    const ta = editorRef.current;
    if (!ta || ta.selectionStart !== ta.selectionEnd) return setSuggest(null);
    const caret = ta.selectionStart;
    const res = getCompletions(
      ta.value,
      caret,
      assets.map((a) => a.name),
      force
    );
    if (!res) return setSuggest(null);

    // 候補を出す位置(単語のはじまりの、すぐ下)
    const cs = getComputedStyle(ta);
    const lines = ta.value.slice(0, res.from).split("\n");
    const ctx = (measureCtx.current ??= document.createElement("canvas").getContext("2d"));
    if (ctx) ctx.font = `${cs.fontSize} ${cs.fontFamily}`;
    const width = ctx ? ctx.measureText(lines[lines.length - 1].replace(/\t/g, "  ")).width : 0;
    const lh = parseFloat(cs.lineHeight) || 24;
    const boxH = Math.min(240, res.items.length * 26 + 8);
    let y = parseFloat(cs.paddingTop) + lines.length * lh - ta.scrollTop;
    const up = y + boxH > ta.clientHeight && y - lh - boxH > 0;
    if (up) y -= lh + boxH;
    const x = Math.max(0, Math.min(parseFloat(cs.paddingLeft) + width - ta.scrollLeft, ta.clientWidth - 300));
    const prev = suggestRef.current;
    const keep = prev && prev.items[prev.index] ? res.items.findIndex((c) => c.label === prev.items[prev.index].label) : -1;
    setSuggest({ ...res, index: keep > 0 ? keep : 0, x, y, up });
  };

  const acceptSuggest = (c: Candidate) => {
    const ta = editorRef.current;
    const sg = suggestRef.current;
    if (!ta || !sg) return;
    applyEdit(applyCandidate(ta.value, sg.from, ta.selectionStart, c));
  };

  const runFormat = () => {
    const ta = editorRef.current;
    if (!ta) return;
    const r = formatCode(ta.value, ta.selectionStart);
    if (r.text === ta.value) return;
    applyEdit({ from: 0, to: ta.value.length, text: r.text, select: [r.caret, r.caret] });
  };

  const onInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onCodeChange(e.target.value);
    if (skipRefresh.current) return;
    const ne = e.nativeEvent as InputEvent;
    if (ne.isComposing) return; // 日本語入力の変換中は、かくていしてから
    const t = ne.inputType ?? "";
    if (t === "insertText" || t === "insertFromComposition") refreshSuggest();
    else if (t.startsWith("delete") && suggestRef.current) refreshSuggest();
    else setSuggest(null);
  };

  const onCompositionEnd = () => requestAnimationFrame(() => refreshSuggest());

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return; // 日本語入力の変換中は何もしない
    const ta = e.currentTarget;
    const { value: v, selectionStart: s, selectionEnd: en } = ta;
    const mod = e.ctrlKey || e.metaKey;
    const sg = suggestRef.current;

    // 入力候補が出ているとき
    if (sg) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = sg.items.length;
        setSuggest({ ...sg, index: (sg.index + (e.key === "ArrowDown" ? 1 : n - 1)) % n });
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggest(null);
        return;
      }
      const cur = sg.items[sg.index];
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        acceptSuggest(cur);
        return;
      }
      if (e.key === "Enter" && !mod && !e.shiftKey && cur.label !== sg.typed) {
        e.preventDefault();
        acceptSuggest(cur);
        return;
      }
      if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", "Enter"].includes(e.key)) setSuggest(null);
    }

    if (mod && e.key === "Enter") {
      e.preventDefault();
      onRun();
    } else if (e.altKey && e.shiftKey && e.code === "KeyF") {
      e.preventDefault();
      runFormat();
    } else if (mod && e.code === "Space") {
      e.preventDefault();
      refreshSuggest(true);
    } else if (mod && e.key === "/") {
      e.preventDefault();
      applyEdit(toggleComment(v, s, en));
    } else if (e.key === "Tab" && !mod && !e.altKey) {
      e.preventDefault();
      const ed = tab(v, s, en, e.shiftKey);
      if (ed) applyEdit(ed);
    } else if (e.key === "Enter" && !mod && !e.altKey) {
      e.preventDefault();
      applyEdit(enter(v, s, en));
    } else if (e.key === "Backspace" && !mod && !e.altKey) {
      const ed = backspace(v, s, en);
      if (ed) {
        e.preventDefault();
        applyEdit(ed);
      }
    } else if (e.key.length === 1 && !mod && !e.altKey) {
      const ed = typeChar(v, s, en, e.key);
      if (ed) {
        e.preventDefault();
        applyEdit(ed);
        if (e.key === '"' || e.key === "'") refreshSuggest(); // makeSprite(" のあと: 画像の名前を出す
      }
    }
  };

  return {
    editorRef,
    hlRef,
    gutterRef,
    cursor,
    suggest,
    closeSuggest: () => setSuggest(null),
    syncScroll,
    updateCursor,
    replaceSelection,
    insertBlock,
    acceptSuggest,
    runFormat,
    onInput,
    onCompositionEnd,
    onKeyDown,
  };
}

export type CodeEditorApi = ReturnType<typeof useCodeEditor>;
