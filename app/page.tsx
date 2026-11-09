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
import { splitCode, compile, RUNTIME, commands } from "@/lib/lang";
import "./editor.css";
import JSZip from "jszip";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/* ---------- テクスチャ ---------- */

type Texture = { name: string; data: string }; // name は "texture/cat.png" の形、data は画像の data URL

const PREFIX = "texture/";
const CODE_KEY = "code";
const TEXTURE_KEY = "textures";

// "cat.png" や "texture/cat.png" を "texture/cat.png" にそろえる
const toPath = (raw: string) => {
  let n = raw.trim().replace(/^texture\//, "").replace(/[\/\\\s"'`]+/g, "_");
  if (!n) return "";
  if (!/\.(png|jpe?g|gif|webp)$/i.test(n)) n += ".png";
  return PREFIX + n;
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/* ---------- コードの色分け ---------- */

const WORD_CLASS: Record<string, string> = {};
const group = (cls: string, names: string[]) =>
  names.forEach((n) => {
    WORD_CLASS[n] = cls;
    const c = commands.find((c) => c.en === n);
    if (c) WORD_CLASS[c.jp] = cls;
  });
group("ev", ["onStart", "onKeyDown", "onKeyUp"]); // イベント(黄)
group("ct", ["if", "else", "while", "for", "times", "sleep"]); // せいぎょ(橙)
group("lk", ["print", "println", "clearLog"]); // 見た目(紫)
group("vr", ["text", "num", "sprite"]); // へんすう・スプライト(ピンク)
group("mt", ["setScreenSize", "makeSprite"]); // 関数(水色)

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

export default function Home() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const skipBlur = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);


  const [inputCode, setInputCode] = useState("");
  const [textures, setTextures] = useState<Texture[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

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

  // localStorage から読み込む
  useEffect(() => {
    setInputCode(localStorage.getItem(CODE_KEY) ?? SAMPLE_CODE);
    try {
      const saved = JSON.parse(localStorage.getItem(TEXTURE_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        setTextures(
          saved.filter((t) => typeof t?.name === "string" && typeof t?.data === "string")
        );
      }
    } catch {
      /* 壊れたデータは無視する */
    }
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const lineCount = useMemo(() => inputCode.split("\n").length, [inputCode]);
  const highlighted = useMemo(() => highlight(inputCode), [inputCode]);

  const onChange = (value: string) => {
    setInputCode(value);
    localStorage.setItem(CODE_KEY, value);
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

  /* --- テクスチャの追加・名前変更・削除 --- */

  // 保存できたときだけ画面にも反映する(容量オーバーのとき用)
  const saveTextures = (next: Texture[]): boolean => {
    try {
      localStorage.setItem(TEXTURE_KEY, JSON.stringify(next));
      setTextures(next);
      setNotice("");
      return true;
    } catch {
      setNotice("保存できなかったよ。画像が大きすぎるかも。小さい画像にしてためしてね。");
      return false;
    }
  };

  const onAddTextures = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const added = await Promise.all(
      files.map(async (f) => ({ name: toPath(f.name), data: await readAsDataUrl(f) }))
    );
    const map = new Map(textures.map((t) => [t.name, t] as const));
    added.forEach((t) => t.name && map.set(t.name, t)); // 同じ名前は上書き
    saveTextures([...map.values()]);
  };

  const startRename = (name: string) => {
    setEditing(name);
    setDraft(name.slice(PREFIX.length));
  };

  const commitRename = () => {
    if (editing === null) return;
    const next = toPath(draft);
    if (next && next !== editing) {
      if (textures.some((t) => t.name === next)) {
        setNotice(`「${next}」はもうあるよ。ちがう名前にしてね。`);
      } else {
        saveTextures(textures.map((t) => (t.name === editing ? { ...t, name: next } : t)));
      }
    }
    setEditing(null);
  };

  const removeTexture = (name: string) => saveTextures(textures.filter((t) => t.name !== name));

  /* --- プロジェクトの書き出し・読み込み (.mks) --- */

  const exportProject = async () => {
    const zip = new JSZip();
    zip.file("code/main.mjs", inputCode);
    textures.forEach((t) => {
      zip.file(t.name, t.data.slice(t.data.indexOf(",") + 1), { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
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
    if (!window.confirm("いまのプログラムと画像は、読み込むものに置きかわるよ。いい?")) return;

    try {
      const zip = await JSZip.loadAsync(file);

      const codeFile = zip.file("code/main.mjs");
      if (!codeFile) throw new Error("code/main.mjs が見つからないよ");
      const code = await codeFile.async("string");

      const imported: Texture[] = [];
      for (const entry of Object.values(zip.files)) {
        if (entry.dir || !entry.name.startsWith(PREFIX)) continue;
        const mime = MIME[entry.name.split(".").pop()?.toLowerCase() ?? ""];
        if (!mime) continue;
        const base64 = await entry.async("base64");
        const name = toPath(entry.name);
        if (name) imported.push({ name, data: `data:${mime};base64,${base64}` });
      }

      if (saveTextures(imported)) onChange(code);
    } catch (err: any) {
      setNotice("読み込めなかったよ: " + (err?.message ?? String(err)));
    }
  };

  /* --- 実行 --- */

  const showError = (message: string) => {
    const log = document.getElementById("logBox");
    if (log) log.textContent += "エラー: " + message + "\n";
  };

  const runCode = async () => {
    // 画像をぜんぶ読み込んでおく
    const entries = await Promise.all(
      textures.map(async (t) => {
        const img = new Image();
        img.src = t.data;
        try {
          await img.decode();
        } catch {
          /* 読み込めない画像は描かれないだけ */
        }
        return [t.name, img] as const;
      })
    );
    const textureMap = Object.fromEntries(entries);

    try {
      const js = `return (async () => {
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
const log = document.getElementById("logBox");
log.textContent = "";
const addLog = (t) => { log.textContent += t; };
const addLogLn = (t) => { log.textContent += t+"\\n";};
const clearLog = () => { log.textContent = ""; };
const setScreenSize = (w, h) => {
  canvas.width = w;
  canvas.height = h;
  draw();
};
const __getTexture = (name) => {
  const img = __textures[name];
  if (!img) addLog("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n");
  return img;
};
${RUNTIME}
${compile(splitCode(inputCode), [])}
})();`;
      console.log(js);
      await new Function("__textures", js)(textureMap);
    } catch (e: any) {
      if (e?.message !== "stopped") {
        showError(e?.message ?? String(e))
        console.log(e);
      };
    }
  };

  const stopCode = () => {
    (window as any).__runId = ((window as any).__runId ?? 0) + 1;
    ((window as any).__cleanups ?? []).forEach((f: any) => f());
    (window as any).__cleanups = [];
  };

  /* --- 見た目 --- */

  return (
    <div className="kc-app">
      <header className="kc-top">
        <div className="kc-title">main.code — コードでゲームをつくろう</div>
        <span className="kc-hint">Ctrl + Enter(Macは ⌘ + Enter)でも実行できるよ</span>
        <button className="kc-btn" onClick={exportProject}>💾 書き出し</button>
        <label className="kc-btn">
          📂 読み込み
          <input className="kc-sr" type="file" accept=".mks" onChange={onImportProject} />
        </label>
      </header>

      <div className="kc-body">
        <aside className="kc-explorer" aria-label="テクスチャ">
          <h2 className="kc-side-title">テクスチャ</h2>
          <div className="kc-folder">▾ texture</div>

          {textures.length === 0 ? (
            <p className="kc-empty">まだ画像がないよ。下のボタンで追加しよう。</p>
          ) : (
            <ul className="kc-files">
              {textures.map((t) => (
                <li key={t.name} className="kc-file">
                  {editing === t.name ? (
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
                        onClick={() => replaceSelection(`"${t.name}"`)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="kc-thumb" src={t.data} alt="" />
                        <span>{t.name.slice(PREFIX.length)}</span>
                      </button>
                      <button
                        className="kc-icon-btn"
                        aria-label={`${t.name} の名前を変える`}
                        onClick={() => startRename(t.name)}
                      >
                        ✎
                      </button>
                      <button
                        className="kc-icon-btn"
                        aria-label={`${t.name} を消す`}
                        onClick={() => removeTexture(t.name)}
                      >
                        ✕
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          <label className="kc-add">
            <input
              className="kc-sr"
              type="file"
              multiple
              accept="image/png"
              onChange={onAddTextures}
            />
            ＋ 画像を追加
          </label>
          {notice && (
            <p className="kc-notice" role="alert">
              {notice}
            </p>
          )}
          <p className="kc-tip">
            名前をクリックすると、カーソルの場所に入るよ。
            <code>sprite cat = makeSprite("texture/cat.png", 50, 50)</code>
          </p>
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
                </div>
              </> : null
            }
            <canvas
              id="gameScreen"
              className="kc-canvas"
              width="400"
              height="300"
            //onDoubleClick={toggleFullscreen}
            />
          </div>
          <h2 className="kc-side-title">ログ</h2>
          <pre id="logBox" className="kc-log" />
        </section>
      </div>

      <footer className="kc-status">
        <span>
          {cursor.line} 行目、{cursor.col} 文字目
        </span>
        <span>自動で保存されます</span>
        <span>画像 {textures.length} 枚</span>
      </footer>
    </div>
  );
}
