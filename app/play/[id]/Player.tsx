"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { fetchProject, type Asset } from "@/lib/mks";
import type { ProjectInfo } from "@/lib/projects";
import GameFrame, { type GameFrameHandle } from "@/app/_components/GameFrame";

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる

/* レイアウト:
     タイトル
     [ 作品(ゲーム画面) ] [ 説明 ]
     [ ログ ]
   タイトルと説明は、長いときは枠を変えずに ... で省略する */
export default function Player({ project }: { project: ProjectInfo }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<GameFrameHandle>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const [data, setData] = useState<{ code: string; assets: Asset[] } | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState("100");
  const [size, setSize] = useState({ w: 400, h: 300 }); // 作品の画面の大きさ(setScreenSize で変わる)
  const [fsBox, setFsBox] = useState<{ w: number; h: number } | null>(null); // 全画面での表示サイズ

  // 作品を読み込む。ページを離れるときは、ゲームも音も止める
  useEffect(() => {
    let alive = true;
    fetchProject(project.id)
      .then((p) => alive && setData({ code: p.code, assets: p.assets }))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));

    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      alive = false;
      document.removeEventListener("fullscreenchange", onFs);
      // ゲームと音は、iframe がページと一緒に消えるので止まる
    };
  }, [project.id]);

  // 読み込みが終わったら、スタートボタンにフォーカスする(Enter / スペースキーでも開始できる)
  useEffect(() => {
    if (data && !started) startRef.current?.focus({ preventScroll: true });
  }, [data, started]);

  // フルスクリーン中は、画面に収まる最大の大きさを計算して iframe に指定する。
  // 縦横比は保つ。拡大は整数倍にして、ピクセルをくっきり表示する(収まらないときだけ縮小)。
  // 作品の大きさ(size)は iframe から届いた値。ゲームが setScreenSize で変えても追従する。
  useEffect(() => {
    if (!isFullscreen) return;
    const stage = stageRef.current;
    if (!stage) return;

    const PADDING = 16;
    const GAP = 16;
    const fit = () => {
      const controlsH = stage.querySelector<HTMLElement>(".ms-controls")?.offsetHeight ?? 0;
      const availW = stage.clientWidth - PADDING * 2;
      const availH = stage.clientHeight - PADDING * 2 - (controlsH ? controlsH + GAP : 0);
      if (availW <= 0 || availH <= 0) return;
      let scale = Math.min(availW / size.w, availH / size.h);
      if (scale >= 1) scale = Math.floor(scale);
      const w = Math.max(1, Math.floor(size.w * scale));
      const h = Math.max(1, Math.floor(size.h * scale));
      setFsBox((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
    };
    const ro = new ResizeObserver(fit); // observe した直後にも 1 回呼ばれる
    ro.observe(stage);
    return () => ro.disconnect();
  }, [isFullscreen, size]);

  const appendLog = (text: string) => {
    const el = logRef.current;
    if (!el) return;
    const next = el.textContent + text;
    el.textContent = next.length > MAX_LOG_CHARS ? next.slice(-MAX_LOG_CHARS) : next;
  };
  const clearLog = () => {
    if (logRef.current) logRef.current.textContent = "";
  };

  const run = () => {
    if (!data) return;
    setStarted(true); // スタート画面をすぐ消す
    frameRef.current?.run(data.code, data.assets, Number(volume));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      /* フルスクリーンにできないときは何もしない */
    }
  };
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = e.target.value;
    setVolume(newVol);
    frameRef.current?.setVolume(Number(newVol)); // iframe の中のゲームに伝える
  };

  const controls = (
    <div className="ms-controls">
      <button
        className="ms-btn ms-btn-green"
        disabled={!data}
        onClick={(e) => { run(); e.currentTarget.blur(); }}
      >
        {started ? "↻ 最初から" : "▶ スタート"}
      </button>
      <button
        className="ms-btn ms-btn-red"
        disabled={!started}
        onClick={(e) => { frameRef.current?.stop(); e.currentTarget.blur(); }}
      >
        ■ 停止
      </button>
      <button className="ms-btn" onClick={(e) => { toggleFullscreen(); e.currentTarget.blur(); }}>
        {isFullscreen ? "🗗 全画面を終了" : "⛶ 全画面"}
      </button>
      <input type="range" value={volume} onChange={handleVolumeChange} min="0" max="100" step="1"/>
    </div>
  );

  const id = encodeURIComponent(project.id);
  const thumbStyle = project.hasThumbnail
    ? ({ "--thumb": `url(/thumbnails/${id})` } as CSSProperties)
    : undefined;

  return (
    <main className="ms-main">
      <div className="ms-play-head">
        <h1 className="ms-play-title ms-ellipsis" title={project.title}>
          {project.title}
        </h1>
        {project.author && <p className="ms-play-author ms-ellipsis">作者: {project.author}</p>}
      </div>

      <div className="ms-play-grid">
        {/* 作品 */}
        <section className="ms-stage" aria-label="ゲーム画面">
          {!isFullscreen && controls}

          <div className="ms-screen" ref={stageRef}>
            {isFullscreen && started && controls}
            <GameFrame
              ref={frameRef}
              className="ms-canvas"
              style={
                isFullscreen && fsBox
                  ? { width: fsBox.w, height: fsBox.h }
                  : // 枠(.ms-screen は container)の幅と高さの両方に収まるように縮める。縦長の作品でも比が崩れない
                    { width: `min(${size.w}px, 100cqw, calc(100cqh * ${size.w} / ${size.h}))` }
              }
              onLog={appendLog}
              onClearLog={clearLog}
              onSize={(w, h) => setSize({ w, h })}
            />

            {!started && (
              <div className="ms-start" style={thumbStyle}>
                <div className="ms-start-inner">
                  {error ? (
                    <p role="alert" className="ms-error">
                      読み込みに失敗しました: {error}
                    </p>
                  ) : (
                    <>
                      <button
                        ref={startRef}
                        className="ms-btn ms-btn-green ms-btn-big"
                        disabled={!data}
                        onClick={run}
                      >
                        {data ? "▶ スタート" : "読み込み中…"}
                      </button>
                      <p className="ms-start-hint">ボタンを押すと開始します(音が出ます)</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 説明 */}
        <aside className="ms-panel ms-side" aria-label="作品の説明">
          <div className="ms-side-inner">
            <h2>説明</h2>
            <p className="ms-side-desc" title={project.description || undefined}>
              {project.description || "説明はありません。"}
            </p>
            <div className="ms-side-actions">
              <Link href={`/make?load=${id}`} className="ms-btn ms-btn-blue">
                ✎ 改造する
              </Link>
              <a href={`/projects/${id}.mks`} download className="ms-btn">
                ⭳ ダウンロード
              </a>
            </div>
          </div>
        </aside>

        {/* ログ */}
        <section className="ms-panel ms-log-panel" aria-label="ログ">
          <h2>ログ</h2>
          <pre ref={logRef} className="ms-log" />
        </section>
      </div>
    </main>
  );
}
