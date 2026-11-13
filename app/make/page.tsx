"use client";

import type { Block } from "blockly";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { commands } from "@/lib/lang";
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
import {
  MIME,
  KINDS,
  kindOf,
  extOf,
  toPath,
  buildMks,
  parseMks,
  toThumbnail,
  fetchProject,
  EMPTY_META,
  type Kind,
  type Asset,
  type Meta,
} from "@/lib/mks";
import GameFrame, { type GameFrameHandle } from "@/app/_components/GameFrame";
import "./editor.css";
import { PANELS, ICONS, type Panel } from "./_sidebar/panels";
import ExplorerPanel from "./_sidebar/ExplorerPanel";
import BlockPanel from "./_sidebar/BlockPanel";
import InfoPanel from "./_sidebar/InfoPanel";
import AssetPanel from "./_sidebar/AssetPanel";

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる

/* ---------- ファイル(texture/ と sound/) ---------- */

const CODE_KEY = "code";
const META_KEY = "meta";
const THUMB_KEY = "thumbnail";
const LEGACY_TEXTURE_KEY = "textures"; // 前のバージョンが localStorage に入れていた画像

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// ブラウザによって種類(MIME)が空になることがあるので、拡張子から付けなおす
const withMime = (data: string, name: string) => {
  const mime = MIME[extOf(name)];
  const i = data.indexOf(",");
  return mime && i !== -1 ? `data:${mime};base64,${data.slice(i + 1)}` : data;
};

/* ---------- 保存場所 (IndexedDB) ----------
   音は画像よりずっと大きいので、5MB ほどしか入らない localStorage ではなく
   IndexedDB に入れる。コードだけは今までどおり localStorage。 */

const DB_NAME = "mikan-script";
const STORE = "assets";

const openDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "name" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const loadAssets = async (): Promise<Asset[]> => {
  const db = await openDb();
  try {
    return await new Promise<Asset[]>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as Asset[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
};

// ぜんぶ入れかえる。1 回のまとまりで書くので、失敗したら何も変わらない
const storeAssets = async (assets: Asset[]) => {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      assets.forEach((a) => store.put(a));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

const isAsset = (a: unknown): a is Asset => {
  const t = a as Asset;
  return typeof t?.name === "string" && typeof t?.data === "string" && kindOf(t.name) !== null;
};

/* ---------- コードの色分け ---------- */

const WORD_CLASS: Record<string, string> = {};
const group = (cls: string, names: string[]) =>
  names.forEach((n) => {
    WORD_CLASS[n] = cls;
    const c = commands.find((c) => c.en === n);
    if (c) WORD_CLASS[c.jp] = cls;
  });
group("ev", ["onStart", "onKeyDown", "onKeyUp"]); // イベント(黄)
group("ct", ["if", "else", "while", "for", "times", "sleep", "await"]); // せいぎょ(橙)
group("lk", ["print", "println", "clearLog"]); // 見た目(紫)
group("vr", ["text", "num", "sprite"]); // へんすう・スプライト(ピンク)
group("mt", ["setScreenSize", "makeSprite", "playSound", "stopSound"]); // 関数(水色)

const HL_RE =
  /(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)|(\d+(?:\.\d+)?)|([^\s.,:?!%()=<>+\-*\/|&\[\]{}"';]+)/g;

const highlight = (code: string): ReactNode[] => {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(HL_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(code.slice(last, i));
    const cls = m[1] ? "cm" : m[2] ? "st" : m[3] ? "nu" : WORD_CLASS[m[4]];
    out.push(
      cls ? (
        <span key={i} className={`tk-${cls}`}>
          {m[0]}
        </span>
      ) : (
        m[0]
      )
    );
    last = i + m[0].length;
  }
  out.push(code.slice(last) + "\n"); // 最後の改行も高さにふくめる
  return out;
};

const SAMPLE_CODE = `// ここにプログラムを書いてね
setScreenSize(400, 300)

sprite cat = makeSprite("texture/cat.png", 50, 50, 64, 64)

onKeyDown(e) {
  cat.x += 10
}
`;

/* ---------- 画面 ---------- */

export default function Editor() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const frameRef = useRef<GameFrameHandle>(null); // 作品を動かす iframe(隔離された画面)
  const logRef = useRef<HTMLPreElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [inputCode, setInputCode] = useState("");
  const [meta, setMeta] = useState<Meta>(EMPTY_META);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [panel, setPanel] = useState<Panel | null>("texture"); // 開いているパネル(null = 閉じている)
  const [closed, setClosed] = useState<Record<string, boolean>>({}); // 閉じているフォルダ
  const [previewName, setPreviewName] = useState<string | null>(null); // 試し聞き中の音
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  // ▼ サイドバー幅のリサイズ用ステートと処理
  const [sidebarWidth, setSidebarWidth] = useState(230);
  const isResizingRef = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const bodyEl = document.querySelector(".kc-body");
      if (!bodyEl) return;
      const rect = bodyEl.getBoundingClientRect();
      const newWidth = moveEvent.clientX - rect.left - 48; // 48pxは活動バーの幅
      if (newWidth >= 150 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };
  // ▲ ここまで

  // 入力候補(x, y は入力欄の中での位置)
  type Suggest = { from: number; items: Candidate[]; index: number; typed: string; x: number; y: number; up: boolean };
  const [suggest, setSuggestState] = useState<Suggest | null>(null);
  const suggestRef = useRef<Suggest | null>(null);
  const skipRefresh = useRef(false);
  const measureCtx = useRef<CanvasRenderingContext2D | null>(null);
  const setSuggest = (v: Suggest | null) => {
    suggestRef.current = v;
    setSuggestState(v);
  };
  const [volume, setVolume] = useState("100");

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      setNotice("フルスクリーンにできなかったよ。");
    }
  };

  // 読み込み: コードは localStorage、画像と音は IndexedDB
  useEffect(() => {
    const savedCode = localStorage.getItem(CODE_KEY);
    setInputCode(savedCode ?? SAMPLE_CODE);
    try {
      const m = JSON.parse(localStorage.getItem(META_KEY) ?? "null");
      if (m) setMeta({ ...EMPTY_META, ...m });
      setThumbnail(localStorage.getItem(THUMB_KEY));
    } catch {
      /* 壊れたデータは無視する */
    }

    let alive = true;
    (async () => {
      // /make?load=作品名 で、ホームの作品を読み込んで改造できる
      const loadId = new URLSearchParams(window.location.search).get("load");
      if (loadId) {
        const hasWork = savedCode !== null && savedCode !== SAMPLE_CODE;
        const ok =
          !hasWork ||
          window.confirm("現在のプログラムと画像・音を、「" + loadId + "」の内容で置き換えます。よろしいですか?");
        if (ok) {
          try {
            const p = await fetchProject(loadId);
            await storeAssets(p.assets);
            if (alive) {
              setAssets(p.assets);
              setInputCode(p.code);
              setMeta(p.meta);
              saveThumbnail(p.thumbnail);
              localStorage.setItem(CODE_KEY, p.code);
              localStorage.setItem(META_KEY, JSON.stringify(p.meta));
              window.history.replaceState(null, "", "/make"); // リロードで確認がまた出ないように
              return;
            }
          } catch (err: any) {
            if (alive) setNotice("作品を読み込めませんでした: " + (err?.message ?? String(err)));
          }
        } else {
          window.history.replaceState(null, "", "/make");
        }
      }
      try {
        let saved = (await loadAssets()).filter(isAsset);

        // 前のバージョンで localStorage に入れた画像があれば、引っ越す
        if (saved.length === 0) {
          try {
            const old = JSON.parse(localStorage.getItem(LEGACY_TEXTURE_KEY) ?? "[]");
            const legacy = Array.isArray(old) ? old.filter(isAsset) : [];
            if (legacy.length > 0) {
              await storeAssets(legacy);
              localStorage.removeItem(LEGACY_TEXTURE_KEY);
              saved = legacy;
            }
          } catch {
            /* 壊れたデータは無視する */
          }
        }
        if (alive) setAssets(saved);
      } catch {
        if (alive) {
          setNotice("画像と音の保存場所を開けなかったよ。シークレットモードだと使えないことがあるよ。");
        }
      }
    })();

    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      alive = false;
      document.removeEventListener("fullscreenchange", onChange);
    };
  }, []);

  const lineCount = useMemo(() => inputCode.split("\n").length, [inputCode]);
  const highlighted = useMemo(() => highlight(inputCode), [inputCode]);

  const byKind = useMemo((): Record<Kind, Asset[]> => {
    const sorted = [...assets].sort((a, b) => a.name.localeCompare(b.name));
    return {
      texture: sorted.filter((a) => kindOf(a.name) === "texture"),
      sound: sorted.filter((a) => kindOf(a.name) === "sound"),
    };
  }, [assets]);

  const onChange = (value: string) => {
    setInputCode(value);
    localStorage.setItem(CODE_KEY, value);
  };

  const onMetaChange = (key: keyof Meta, value: string) => {
    const next = { ...meta, [key]: value };
    setMeta(next);
    localStorage.setItem(META_KEY, JSON.stringify(next));
  };

  // サムネイルは localStorage に入れる(小さくしてあるので入る。入らなかったら画面だけ)
  function saveThumbnail(data: string | null) {
    setThumbnail(data);
    try {
      if (data) localStorage.setItem(THUMB_KEY, data);
      else localStorage.removeItem(THUMB_KEY);
    } catch {
      setNotice("サムネイルを保存できませんでした。書き出しが終わるまで、このページを開いたままにしてください。");
    }
  }

  const onPickThumbnail = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      saveThumbnail(await toThumbnail(await readAsDataUrl(file)));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "サムネイルを設定できませんでした。");
    }
  };

  // いま実行画面に出ている絵を、そのままサムネにする
  const captureThumbnail = async () => {
    try {
      const shot = await frameRef.current?.capture();
      if (!shot) return;
      saveThumbnail(await toThumbnail(shot));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "サムネイルを設定できませんでした。");
    }
  };

  /* --- エディタまわり --- */

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
    onChange(inputCode.slice(0, s) + text + inputCode.slice(e));
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
        onChange(expected);
      }
    }
    ta.setSelectionRange(ed.select[0], ed.select[1]);
    updateCursor();
  };

  // サイドバーで押したブロックを、コードにして入力欄のカーソルの位置に入れる
  const insertBlock = (block: Block) => {
    const ta = editorRef.current;
    if (!ta) return;
    const v = ta.value;
    const pos = ta.selectionEnd;
    const ls = v.lastIndexOf("\n", pos - 1) + 1;
    const le = v.indexOf("\n", pos) === -1 ? v.length : v.indexOf("\n", pos);
    const line = v.slice(ls, le);
    const blank = line.trim() === "";
    // いまの行と同じインデント({ で終わる行のあとなら 1 段ふかく)
    const base = /^[ \t]*/.exec(line)![0] + (!blank && line.trimEnd().endsWith("{") ? "  " : "");
    const code = blockToCode(block)
      .split("\n")
      .map((l, i) => (i === 0 ? l : base + l))
      .join("\n");
    // 空の行ならそこに、文字がある行なら次の行に入れる
    const ed: Edit = blank
      ? { from: ls, to: le, text: base + code, select: [ls + base.length + code.length, ls + base.length + code.length] }
      : { from: le, to: le, text: "\n" + base + code, select: [le + 1 + base.length + code.length, le + 1 + base.length + code.length] };
    applyEdit(ed);
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

  const onEditorInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (skipRefresh.current) return;
    const ne = e.nativeEvent as InputEvent;
    if (ne.isComposing) return; // 日本語入力の変換中は、かくていしてから
    const t = ne.inputType ?? "";
    if (t === "insertText" || t === "insertFromComposition") refreshSuggest();
    else if (t.startsWith("delete") && suggestRef.current) refreshSuggest();
    else setSuggest(null);
  };

  const onEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
      runCode();
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

  /* --- 画像・音の追加・名前変更・削除 --- */

  // 保存できたときだけ画面にも反映する(容量オーバーのとき用)
  const saveAssets = async (next: Asset[]): Promise<boolean> => {
    try {
      await storeAssets(next);
      setAssets(next);
      setNotice("");
      return true;
    } catch {
      setNotice("保存できなかったよ。ファイルが大きすぎるかも。小さいファイルでためしてね。");
      return false;
    }
  };

  const onAddFiles = (kind: Kind) => async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const usable =
      kind === "sound"
        ? files.filter((f) => f.type.startsWith("audio/") || KINDS.sound.ext.test(f.name))
        : files;
    if (usable.length === 0) {
      setNotice("使えないファイルだよ。音は mp3 / wav / ogg / m4a にしてね。");
      return;
    }

    const added = await Promise.all(
      usable.map(async (f) => {
        const name = toPath(f.name, kind);
        return { name, data: withMime(await readAsDataUrl(f), name) };
      })
    );
    const map = new Map(assets.map((a) => [a.name, a] as const));
    added.forEach((a) => a.name && map.set(a.name, a)); // 同じ名前は上書き
    await saveAssets([...map.values()]);
  };

  const startRename = (name: string) => {
    const kind = kindOf(name);
    if (!kind) return;
    setEditing(name);
    setDraft(name.slice(KINDS[kind].prefix.length));
  };

  const commitRename = async () => {
    if (editing === null) return;
    const from = editing;
    const kind = kindOf(from);
    setEditing(null);
    if (!kind) return;

    // 拡張子を書かなかったときは、元の拡張子のままにする
    const next = toPath(draft, kind, extOf(from));
    if (next && next !== from) {
      if (assets.some((a) => a.name === next)) {
        setNotice(`「${next}」はもうあるよ。ちがう名前にしてね。`);
      } else {
        if (previewName === from) stopPreview();
        await saveAssets(assets.map((a) => (a.name === from ? { ...a, name: next } : a)));
      }
    }
  };

  const removeAsset = (name: string) => {
    if (previewName === name) stopPreview();
    void saveAssets(assets.filter((a) => a.name !== name));
  };

  /* --- 音の試し聞き --- */

  const stopPreview = () => {
    previewRef.current?.pause();
    previewRef.current = null;
    setPreviewName(null);
  };

  const togglePreview = (a: Asset) => {
    if (previewName === a.name) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(a.data);
    previewRef.current = audio;
    setPreviewName(a.name);
    audio.onended = () => {
      if (previewRef.current === audio) stopPreview();
    };
    audio.play().catch(() => {
      if (previewRef.current === audio) stopPreview();
      setNotice("この音は鳴らせなかったよ。");
    });
  };

  const toggleFolder = (key: string) => setClosed((c) => ({ ...c, [key]: !c[key] }));

  // 縦バーのアイコン: 開いているアイコンをもう一度押すと、サイドバーが閉じる
  const showPanel = (next: Panel | null) => {
    if (next !== "sound") stopPreview();
    setEditing(null);
    setPanel(next);
  };
  const clickActivity = (id: Panel) => showPanel(panel === id ? null : id);

  const codeBytes = useMemo(() => new Blob([inputCode]).size, [inputCode]);

  /* --- プロジェクトの書き出し・読み込み (.mks) --- */

  const exportProject = async () => {
    const blob = await buildMks(inputCode, assets, meta, thumbnail);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.mks";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportProject = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("いまのプログラムと画像・音は、読み込むものに置きかわるよ。いい?")) return;

    try {
      const { code, assets: imported, meta: importedMeta, thumbnail: importedThumb } = await parseMks(file);

      stopPreview();
      if (await saveAssets(imported)) {
        onChange(code);
        setMeta(importedMeta);
        saveThumbnail(importedThumb);
        localStorage.setItem(META_KEY, JSON.stringify(importedMeta));
      }
    } catch (err: any) {
      setNotice("読み込めなかったよ: " + (err?.message ?? String(err)));
    }
  };

  /* --- 実行 --- */

  const appendLog = (text: string) => {
    const el = logRef.current;
    if (!el) return;
    const next = el.textContent + text;
    el.textContent = next.length > MAX_LOG_CHARS ? next.slice(-MAX_LOG_CHARS) : next;
  };
  const clearLog = () => {
    if (logRef.current) logRef.current.textContent = "";
  };

  // 作品は、隔離された iframe の中で動く(ここのクッキーや保存データには触れない)。
  // 実行のたびに iframe を作りなおすので、前の実行と音は全部消える
  const runCode = () => {
    stopPreview();
    frameRef.current?.run(inputCode, assets, Number(volume));
  };

  // 止めると、鳴っている音も止まる
  const stopCode = () => frameRef.current?.stop();

  /* --- 見た目 --- */

  // 動いているゲームの音量を、すぐに変える(iframe の中に postMessage で伝える)
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = e.target.value;
    setVolume(newVol);
    frameRef.current?.setVolume(Number(newVol));
  };

  return (
    <div className="kc-app">
      <header className="kc-top">
        <Link href="/" className="kc-btn" title="作品一覧">
          🍊 ホーム
        </Link>
        <div className="kc-title">main.code — コードでゲームをつくろう</div>
        <span className="kc-hint">Ctrl + Enter(Macは ⌘ + Enter)でも実行できるよ</span>
        <button className="kc-btn" onClick={exportProject}>💾 書き出し</button>
        <label className="kc-btn">
          📂 読み込み
          <input className="kc-sr" type="file" accept=".mks" onChange={onImportProject} />
        </label>
      </header>

      {/* ▼ gridTemplateColumns にステートの sidebarWidth を適用 */}
      <div
        className={`kc-body${panel ? "" : " is-collapsed"}`}
        style={{
          gridTemplateColumns: `48px ${panel ? sidebarWidth : 0}px minmax(0, 1fr) minmax(320px, 440px)`,
        }}
      >
        <nav className="kc-activity" aria-label="サイドバーの切りかえ">
          {PANELS.map(({ id, label }) => {
            const active = panel === id;
            return (
              <button
                key={id}
                className={`kc-act${active ? " is-active" : ""}`}
                aria-label={label}
                aria-pressed={active}
                title={label}
                onClick={() => clickActivity(id)}
              >
                {ICONS[id]}
              </button>
            );
          })}
        </nav>

        <aside
          className={`kc-explorer${panel ? "" : " is-closed"}`}
          aria-label="サイドバー"
        >
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
              onFocusEditor={() => editorRef.current?.focus()}
              onExport={exportProject}
              onImport={onImportProject}
            />
          )}
          {panel === "block" && <BlockPanel onPickBlock={insertBlock} />}
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
              onCancelRename={() => setEditing(null)}
              onRemove={removeAsset}
              onTogglePreview={togglePreview}
              onInsertName={(name) => replaceSelection(`"${name}"`)}
              onAddFiles={onAddFiles(panel)}
            />
          )}
          {panel && notice && (
            <p className="kc-notice" role="alert">
              {notice}
            </p>
          )}

          {/* ▼ マウスでドラッグするためのリサイザーを追加 */}
          <div className="kc-resizer" onMouseDown={startResizing} />
        </aside>

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
                value={inputCode}
                wrap="off"
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                aria-label="プログラムを書く場所"
                onChange={onEditorInput}
                onCompositionEnd={() => requestAnimationFrame(() => refreshSuggest())}
                onKeyDown={onEditorKeyDown}
                onBlur={() => setSuggest(null)}
                onMouseDown={() => setSuggest(null)}
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

        <section className="kc-stage" aria-label="ステージ">
          <div className="kc-controls">
            <button className="kc-btn kc-run" onClick={(e) => { runCode(); e.currentTarget.blur() }}>
              ▶ 実行
            </button>
            <button className="kc-btn kc-stop" onClick={stopCode}>
              ■ 止める
            </button>
            <button
              className="kc-btn"
              onClick={(e) => { toggleFullscreen(); e.currentTarget.blur(); }}
            >
              ⛶ フルスクリーン
            </button>
            <input type="range" className="w-[75]" value={volume} onChange={handleVolumeChange} min="0" max="100" step="1" />
          </div>

          <div className="kc-screen" ref={stageRef}>
            {isFullscreen ?
              <>
                <div className="kc-controls mr-auto">
                  <button className="kc-btn kc-run" onClick={(e) => { runCode(); e.currentTarget.blur() }}>
                    ▶ 実行
                  </button>
                  <button className="kc-btn kc-stop" onClick={stopCode}>
                    ■ 止める
                  </button>
                  <button
                    className="kc-btn"
                    onClick={(e) => { toggleFullscreen(); e.currentTarget.blur(); }}
                  >
                    🗗 もどす
                  </button>
                  <input type="range" value={volume} onChange={handleVolumeChange} min="0" max="100" step="1" />
                </div>
              </> : null
            }
            <GameFrame
              ref={frameRef}
              className="kc-canvas"
              // 全画面では、CSS(.kc-screen:fullscreen .kc-canvas)で高さいっぱいに広げる
              style={isFullscreen ? { width: "auto", height: "100%" } : undefined}
              onLog={appendLog}
              onClearLog={clearLog}
            />
          </div>
          <h2 className="kc-side-title">ログ</h2>
          <pre ref={logRef} className="kc-log" />
        </section>
      </div>

      <footer className="kc-status">
        <span>
          {cursor.line} 行目、{cursor.col} 文字目
        </span>
        <span>自動で保存されます</span>
        <span>
          画像 {byKind.texture.length} 枚 ・ 音 {byKind.sound.length} 個
        </span>
      </footer>
    </div>
  );
}