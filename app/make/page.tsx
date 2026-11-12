"use client";

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
import {
  MIME,
  KINDS,
  KIND_LIST,
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

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる

/* ---------- ファイル(texture/ と sound/) ---------- */

// 左端の縦バー(VS Code のアクティビティバー)で切りかえるパネル
type Panel = "explorer" | "info" | "texture" | "sound";

const PANELS: { id: Panel; label: string }[] = [
  { id: "explorer", label: "エクスプローラー(書き出しの中身)" },
  { id: "info", label: "作品の情報(タイトル・説明・サムネ)" },
  { id: "texture", label: "テクスチャ" },
  { id: "sound", label: "サウンド" },
];

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const ICONS: Record<Panel, ReactNode> = {
  explorer: (
    <svg {...svgProps}>
      <path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v12A1.5 1.5 0 0 0 7.5 18h9a1.5 1.5 0 0 0 1.5-1.5V7l-4-4z" />
      <path d="M14 3v4.5a.5.5 0 0 0 .5.5H18" />
      <path d="M9 21h8.5a2.5 2.5 0 0 0 2.5-2.5V10" />
    </svg>
  ),
  info: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  ),
  texture: (
    <svg {...svgProps}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 17l5-4.5 3.5 3L15.5 13l4.5 4" />
    </svg>
  ),
  sound: (
    <svg {...svgProps}>
      <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6" />
      <path d="M18 6.5a8 8 0 0 1 0 11" />
    </svg>
  ),
};

// data URL の中身(base64)が、ファイルとして何バイトか
const assetBytes = (a: Asset) =>
  Math.round(((a.data.length - a.data.indexOf(",") - 1) * 3) / 4);

const fmtSize = (n: number) =>
  n < 1024
    ? `${n} B`
    : n < 1024 * 1024
      ? `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;

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
  const skipBlur = useRef(false);
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

  const onEditorKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      replaceSelection("  ");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runCode();
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

  // フォルダの行(▾ / ▸ で開け閉め)
  const renderFolderRow = (key: string, label: string, count: number) => {
    const open = !closed[key];
    return (
      <div
        className="kc-folder"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => toggleFolder(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFolder(key);
          }
        }}
      >
        <span className="kc-chev" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      {label}
        <span className="kc-folder-count">{count}</span>
      </div>
    );
  };

  const renderFile = (a: Asset) => {
    const kind = kindOf(a.name) as Kind;
    const label = a.name.slice(KINDS[kind].prefix.length);
    const playing = previewName === a.name;

    return (
      <li key={a.name} className="kc-file">
        {editing === a.name ? (
          <input
            className="kc-rename"
            value={draft}
            autoFocus
            spellCheck={false}
            aria-label="あたらしい名前"
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              if (skipBlur.current) {
                skipBlur.current = false;
                return;
              }
              commitRename();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                skipBlur.current = true;
                setEditing(null);
              }
            }}
          />
        ) : (
          <>
            <button
              className="kc-file-main"
              title="クリックで、コードに名前を入れる"
              onClick={() => replaceSelection(`"${a.name}"`)}
            >
              {kind === "texture" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="kc-thumb" src={a.data} alt="" />
              ) : (
                <span className="kc-snd-ico" aria-hidden="true">
                  🔊
                </span>
              )}
              <span>{label}</span>
            </button>
            {kind === "sound" && (
              <button
                className={`kc-icon-btn${playing ? " is-on" : ""}`}
                aria-label={playing ? `${a.name} を止める` : `${a.name} を試しに聞く`}
                title={playing ? "止める" : "試しに聞く"}
                onClick={() => togglePreview(a)}
              >
                {playing ? "■" : "▶"}
              </button>
            )}
            <button
              className="kc-icon-btn"
              aria-label={`${a.name} の名前を変える`}
              onClick={() => startRename(a.name)}
            >
              ✎
            </button>
            <button
              className="kc-icon-btn"
              aria-label={`${a.name} を消す`}
              onClick={() => removeAsset(a.name)}
            >
              ✕
            </button>
          </>
        )}
      </li>
    );
  };

  // テクスチャ / サウンドのパネル
  const renderAssetPanel = (kind: Kind) => {
    const files = byKind[kind];
    const isTexture = kind === "texture";
    return (
      <>
        <h2 className="kc-side-title">{isTexture ? "テクスチャ" : "サウンド"}</h2>

        {files.length === 0 ? (
          <p className="kc-empty">
            {isTexture
              ? "まだ画像がないよ。下のボタンで追加しよう。"
              : "まだ音がないよ。下のボタンで追加しよう。"}
          </p>
        ) : (
          <ul className="kc-files kc-flat">{files.map(renderFile)}</ul>
        )}

        <label className={isTexture ? "kc-add" : "kc-add kc-add-sound"}>
          <input
            className="kc-sr"
            type="file"
            multiple
            accept={isTexture ? "image/png" : "audio/*,.mp3,.wav,.ogg,.m4a"}
            onChange={onAddFiles(kind)}
          />
          {isTexture ? "＋ 画像を追加" : "＋ 音を追加"}
        </label>

        {isTexture ? (
          <p className="kc-tip">
            名前をクリックすると、カーソルの場所に入るよ。
            <code>sprite cat = makeSprite("texture/cat.png", 50, 50)</code>
          </p>
        ) : (
          <p className="kc-tip">
            名前をクリックすると、カーソルの場所に入るよ。鳴らし方は 2 つ。
            <code>await playSound("sound/bgm.mp3")</code>
            ↑ 音が終わるまで、次に進まない
            <code>playSound("sound/hit.wav")</code>
            ↑ 鳴らしたら、すぐ次に進む
          </p>
        )}
      </>
    );
  };

  // 動いているゲームの音量を、すぐに変える(iframe の中に postMessage で伝える)
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = e.target.value;
    setVolume(newVol);
    frameRef.current?.setVolume(Number(newVol));
  };

  // 作品の情報: 一覧に出るタイトル・説明・サムネ(書き出すと config.json と thumbnail.png になる)
  const renderInfo = () => (
    <>
      <h2 className="kc-side-title">作品の情報</h2>

      <label className="kc-field">
        <span>タイトル</span>
        <input
          value={meta.title}
          maxLength={60}
          placeholder="例: みかん回避ゲーム"
          onChange={(e) => onMetaChange("title", e.target.value)}
        />
      </label>
      <label className="kc-field">
        <span>作者</span>
        <input
          value={meta.author}
          maxLength={40}
          placeholder="名前"
          onChange={(e) => onMetaChange("author", e.target.value)}
        />
      </label>
      <label className="kc-field">
        <span>説明</span>
        <textarea
          value={meta.description}
          maxLength={200}
          rows={4}
          placeholder="ゲームの内容や遊び方"
          onChange={(e) => onMetaChange("description", e.target.value)}
        />
        <span className="kc-count">{meta.description.length} / 200</span>
      </label>

      <div className="kc-field">
        <span>サムネイル</span>
        <div className="kc-thumb-box">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="サムネイル" />
          ) : (
            <p className="kc-empty">未設定</p>
          )}
        </div>
      </div>
      <button className="kc-add" onClick={captureThumbnail}>
        📷 実行画面をサムネイルに設定
      </button>
      <label className="kc-add kc-add-sound">
        <input className="kc-sr" type="file" accept="image/*" onChange={onPickThumbnail} />
        ＋ 画像を選択
      </label>
      {thumbnail && (
        <button className="kc-add kc-add-sound" onClick={() => saveThumbnail(null)}>
          ✕ サムネイルを削除
        </button>
      )}

      <p className="kc-tip">
        「書き出し」を押すと、<b>config.json</b> と <b>thumbnail.png</b> が project.mks の最上位に保存されます。
        ホームの作品一覧には、この内容が表示されます。先に「▶ 実行」してから設定すると、ゲーム画面をサムネイルにできます。
      </p>
    </>
  );

  // エクスプローラー: 「書き出し」で作られる project.mks (zip) の中身
  const renderExplorer = () => {
    const total = codeBytes + assets.reduce((sum, a) => sum + assetBytes(a), 0);
    const hasConfig = !!(meta.title || meta.author || meta.description);
    const rootFiles = (hasConfig ? 1 : 0) + (thumbnail ? 1 : 0);
    const fileCount = 1 + assets.length + rootFiles;
    return (
      <>
        <h2 className="kc-side-title">エクスプローラー</h2>

        {renderFolderRow("root", "project.mks", fileCount)}
        {!closed.root && (
          <ul className="kc-files">
            {hasConfig && (
              <li className="kc-file">
                <button className="kc-file-main" title="クリックで作品の情報を開く" onClick={() => showPanel("info")}>
                  <span></span>
                  <span>config.json</span>
                </button>
              </li>
            )}
            {thumbnail && (
              <li className="kc-file">
                <button className="kc-file-main" title="クリックで作品の情報を開く" onClick={() => showPanel("info")}>
                  <span></span>
                  <span>thumbnail.png</span>
                </button>
              </li>
            )}
            <li>
              {renderFolderRow("code", "code", 1)}
              {!closed.code && (
                <ul className="kc-files">
                  <li className="kc-file">
                    <button
                      className="kc-file-main"
                      title="クリックで、エディタにもどる"
                      onClick={() => editorRef.current?.focus()}
                    >
                      {/* <span className="kc-snd-ico kc-ico-code" aria-hidden="true">
                        {"{ }"}
                      </span> */}
                      <span></span>
                      <span>main.mjs</span>
                      <span className="kc-size">{fmtSize(codeBytes)}</span>
                    </button>
                  </li>
                </ul>
              )}
            </li>

            {/* 中身があるフォルダだけ出す(zip にも、あるものだけ入るので) */}
            {KIND_LIST.filter((k) => byKind[k].length > 0).map((kind) => (
              <li key={kind}>
                {renderFolderRow(kind, kind, byKind[kind].length)}
                {!closed[kind] && (
                  <ul className="kc-files">
                    {byKind[kind].map((a) => (
                      <li key={a.name} className="kc-file">
                        <button
                          className="kc-file-main"
                          title={`クリックで、${kind === "texture" ? "テクスチャ" : "サウンド"}を開く`}
                          onClick={() => showPanel(kind)}
                        >
                          {/* {kind === "texture" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="kc-thumb" src={a.data} alt="" />
                          ) : (
                            <span className="kc-snd-ico" aria-hidden="true">
                              🔊
                            </span>
                          )} */}
                          <span></span>
                          <span>{a.name.slice(KINDS[kind].prefix.length)}</span>
                          <span className="kc-size">{fmtSize(assetBytes(a))}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className="kc-tip">
          「書き出し」を押すと、この中身が <b>project.mks</b>(zip)になるよ。ぜんぶで約 {fmtSize(total)}。
        </p>
        <button className="kc-add" onClick={exportProject}>
          💾 書き出し
        </button>
                <label className="kc-import">
          📂 読み込み
          <input className="kc-sr" type="file" accept=".mks" onChange={onImportProject} /></label>
      </>
    );
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

      <div className={`kc-body${panel ? "" : " is-collapsed"}`}>
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
                {/* {count > 0 && <span className="kc-badge">{count}</span>} */}
              </button>
            );
          })}
        </nav>

        <aside
          className={`kc-explorer${panel ? "" : " is-closed"}`}
          aria-label="サイドバー"
        >
          {panel === "explorer" && renderExplorer()}
          {panel === "info" && renderInfo()}
          {(panel === "texture" || panel === "sound") && renderAssetPanel(panel)}
          {panel && notice && (
            <p className="kc-notice" role="alert">
              {notice}
            </p>
          )}
        </aside>

        <section className="kc-editor" aria-label="プログラム">
          <div className="kc-tabs">
            <div className="kc-tab">
              <span className="kc-dot" />
              main.code
            </div>
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
                onChange={(e) => onChange(e.target.value)}
                onScroll={syncScroll}
                onSelect={updateCursor}
              />
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
            <input type="range" className="w-[75]" value={volume} onChange={handleVolumeChange} min="0" max="100" step="1"/>
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
                  <input type="range" value={volume} onChange={handleVolumeChange} min="0" max="100" step="1"/>
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