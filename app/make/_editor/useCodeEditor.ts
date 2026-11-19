import type { Block } from "blockly";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { blockToCode } from "@/lib/blocks";
import {
  typeChar,
  backspace,
  enter,
  tab,
  toggleComment,
  wholeLine,
  deleteLines,
  moveLines,
  copyLines,
  selectLine,
  insertLine,
  smartHome,
  indentLines,
  findDefinition,
  formatCode,
  getCompletions,
  applyCandidate,
  type Edit,
  type Candidate,
} from "@/lib/editing";
import { dataUrlToText, type Asset } from "@/lib/mks";
import { useLocale } from "@/app/_components/LocaleProvider";
import { useFind } from "./useFind";

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
  assets: Asset[]; // makeSprite(" のあとに画像の名前を、import "…" のあとにコードファイルの名前を、候補に出す
  onRun: () => void; // Ctrl + Enter
  // Ctrl + クリックで、ほかのコードファイルの定義へ飛ぶとき(file は "code/xxx.code")
  onOpenDefinition?: (file: string, line: number, col: number, length: number) => void;
};

// コード入力欄の動き: スクロール同期・カーソル位置・キー操作・入力候補・ブロックの挿入
export function useCodeEditor({ code, onCodeChange, assets, onRun, onOpenDefinition }: Params) {
  const { locale } = useLocale();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  // 色分け表示・行番号の「中身」。入力欄のスクロール量だけ transform で動かして重ねる
  const hlRef = useRef<HTMLSpanElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const errBandsRef = useRef<HTMLDivElement>(null);
  const findHlRef = useRef<HTMLSpanElement>(null); // 検索で見つけた場所の色づけ
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const [suggest, setSuggestState] = useState<Suggest | null>(null);
  const suggestRef = useRef<Suggest | null>(null);
  const skipRefresh = useRef(false);
  const measureCtx = useRef<CanvasRenderingContext2D | null>(null);
  const setSuggest = (v: Suggest | null) => {
    suggestRef.current = v;
    setSuggestState(v);
  };

  // 入力欄(textarea)のスクロールに、色分け表示と行番号を合わせる。
  // 色分け側を scrollTop で合わせると、入力欄だけがスクロールバーの分せまいため、
  // 一番下・右までスクロールしたときに動ける量がずれて、カーソルと文字がずれてしまう。
  // そこで、スクロールさせずに、同じ量だけ transform で動かす。
  const syncScroll = () => {
    const ta = editorRef.current;
    if (!ta) return;
    if (hlRef.current) hlRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (errBandsRef.current) errBandsRef.current.style.transform = `translateY(${-ta.scrollTop}px)`;
    if (findHlRef.current) findHlRef.current.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
  };

  // 文字を入れたあと・大きさが変わったあとも合わせなおす
  useLayoutEffect(() => {
    syncScroll();
  }, [code]);
  useLayoutEffect(() => {
    const ta = editorRef.current;
    if (!ta || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncScroll());
    ro.observe(ta);
    return () => ro.disconnect();
  }, []);

  const updateCursor = () => {
    const ta = editorRef.current;
    if (!ta) return;
    const lines = ta.value.slice(0, ta.selectionStart).split("\n");
    setCursor({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  // 指定した行へスクロール＆カーソル移動する(エラー行へのジャンプ用)
  const jumpToLine = (lineNumber: number, target?: { col: number; length: number }) => {
    requestAnimationFrame(() => {
      const ta = editorRef.current;
      if (!ta) return;
      const lines = ta.value.split("\n");
      const targetLine = Math.max(1, Math.min(lines.length, lineNumber));
      let start = 0;
      for (let i = 0; i < targetLine - 1; i++) {
        start += lines[i].length + 1;
      }
      const lineLen = lines[targetLine - 1]?.length ?? 0;
      // 名前の場所が分かっているときは、その名前だけを選ぶ(エラー行のジャンプは、行ぜんたい)
      const selFrom = target ? start + Math.min(target.col, lineLen) : start;
      const selTo = target ? Math.min(start + lineLen, selFrom + target.length) : start + lineLen;
      ta.focus();
      ta.setSelectionRange(selFrom, selTo);
      const lh = parseFloat(getComputedStyle(ta).lineHeight) || 24;
      ta.scrollTop = Math.max(0, (targetLine - 1) * lh - ta.clientHeight / 2 + lh / 2);
      syncScroll();
      updateCursor();
    });
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
      force,
      moduleSource,
      locale
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

  const find = useFind({ code, editorRef, applyEdit, syncScroll, updateCursor });

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

  // VS Code と同じ: 何も選んでいないときの Ctrl + C / Ctrl + X は、行ぜんぶが対象
  const onCopy = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (ta.selectionStart !== ta.selectionEnd) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", wholeLine(ta.value, ta.selectionStart).text);
  };
  const onCut = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    if (ta.selectionStart !== ta.selectionEnd) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", wholeLine(ta.value, ta.selectionStart).text);
    applyEdit(deleteLines(ta.value, ta.selectionStart, ta.selectionEnd));
  };

  // コードファイルの中身(「名前.」のあとの候補・定義ジャンプ用)
  const moduleSource = (path: string) => {
    const a = assets.find((x) => x.name === path);
    return a ? dataUrlToText(a.data) : undefined;
  };

  // Ctrl + クリック: クリックした名前が作られている場所へ飛ぶ
  const goToDefinition = (offset: number) => {
    const ta = editorRef.current;
    if (!ta) return;
    const def = findDefinition(ta.value, offset, moduleSource);
    if (!def) return;
    if (def.file === null) jumpToLine(def.line, { col: def.col, length: def.length });
    else onOpenDefinition?.(def.file, def.line, def.col, def.length);
  };

  const onClick = (e: MouseEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
    const ta = e.currentTarget;
    if (ta.selectionStart !== ta.selectionEnd) return; // 範囲を選んでいるときは、ふつうの操作
    goToDefinition(ta.selectionStart);
  };

  // Ctrl を押しているあいだは、マウスの形を「クリックできる」にする
  const onMouseMove = (e: MouseEvent<HTMLTextAreaElement>) => {
    e.currentTarget.classList.toggle("is-link", e.ctrlKey || e.metaKey);
  };
  const onMouseLeave = (e: MouseEvent<HTMLTextAreaElement>) => {
    e.currentTarget.classList.remove("is-link");
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
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !e.altKey) {
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

    const k = e.code;
    if (mod && !e.altKey && !e.shiftKey && k === "KeyF") {
      e.preventDefault();
      find.openFind(false);
    } else if (mod && !e.altKey && k === "KeyH") {
      e.preventDefault();
      find.openFind(true);
    } else if (k === "F3" && !mod) {
      e.preventDefault();
      if (e.shiftKey) find.prev();
      else find.next();
    } else if (e.key === "Escape" && find.open) {
      e.preventDefault();
      find.close();
    } else if (mod && !e.altKey && !e.shiftKey && k === "KeyD") {
      e.preventDefault();
      find.selectNextOccurrence();
    } else if (mod && !e.altKey && !e.shiftKey && k === "KeyL") {
      e.preventDefault();
      applyEdit(selectLine(v, s, en));
    } else if (mod && e.shiftKey && !e.altKey && k === "KeyK") {
      e.preventDefault();
      applyEdit(deleteLines(v, s, en));
    } else if (e.altKey && !mod && (k === "ArrowUp" || k === "ArrowDown")) {
      e.preventDefault();
      const dir = k === "ArrowUp" ? -1 : 1;
      const ed = e.shiftKey ? copyLines(v, s, en, dir) : moveLines(v, s, en, dir);
      if (ed) applyEdit(ed);
    } else if (mod && !e.altKey && (k === "BracketRight" || k === "BracketLeft")) {
      e.preventDefault();
      const ed = indentLines(v, s, en, k === "BracketLeft");
      if (ed) applyEdit(ed);
    } else if (mod && e.shiftKey && e.key === "Enter") {
      e.preventDefault();
      applyEdit(insertLine(v, s, true));
    } else if (k === "Home" && !mod && !e.altKey) {
      e.preventDefault();
      const back = ta.selectionDirection === "backward";
      const focus = back ? s : en;
      const to = smartHome(v, focus);
      if (e.shiftKey) {
        const anchor = back ? en : s;
        ta.setSelectionRange(Math.min(anchor, to), Math.max(anchor, to), to < anchor ? "backward" : "forward");
      } else ta.setSelectionRange(to, to);
      updateCursor();
    } else if (mod && e.key === "Enter") {
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
    errBandsRef,
    findHlRef,
    find,
    cursor,
    suggest,
    closeSuggest: () => setSuggest(null),
    syncScroll,
    updateCursor,
    jumpToLine,
    replaceSelection,
    insertBlock,
    acceptSuggest,
    runFormat,
    onInput,
    onCompositionEnd,
    onKeyDown,
    onCopy,
    onCut,
    onClick,
    onMouseMove,
    onMouseLeave,
  };
}

export type CodeEditorApi = ReturnType<typeof useCodeEditor>;