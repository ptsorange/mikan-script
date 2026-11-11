"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  fetchProject,
  prepareAssets,
  buildScript,
  runScript,
  stopScript,
  type Asset,
} from "@/lib/mks";
import type { ProjectInfo } from "@/lib/projects";

/* レイアウト:
     タイトル
     [ 作品(ゲーム画面) ] [ 説明 ]
     [ ログ ]
   タイトルと説明は、長いときは枠を変えずに ... で省略する */
export default function Player({ project }: { project: ProjectInfo }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const soundUrlsRef = useRef<string[]>([]);
  const [data, setData] = useState<{ code: string; assets: Asset[] } | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState("100");

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
      stopScript();
      soundUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [project.id]);

  // 読み込みが終わったら、スタートボタンにフォーカスする(Enter / スペースキーでも開始できる)
  useEffect(() => {
    if (data && !started) startRef.current?.focus({ preventScroll: true });
  }, [data, started]);

  // フルスクリーン中は、画面に収まる最大の大きさを計算して canvas に指定する。
  // 縦横比は保つ。拡大は整数倍にして、ピクセルをくっきり表示する(収まらないときだけ縮小)。
  useEffect(() => {
    if (!isFullscreen) return;
    const stage = stageRef.current;
    const canvas = document.getElementById("gameScreen") as HTMLCanvasElement | null;
    if (!stage || !canvas) return;

    const PADDING = 16;
    const GAP = 16;
    let raf = 0;
    let last = "";
    const fit = () => {
      const controlsH = stage.querySelector<HTMLElement>(".ms-controls")?.offsetHeight ?? 0;
      const availW = stage.clientWidth - PADDING * 2;
      const availH = stage.clientHeight - PADDING * 2 - (controlsH ? controlsH + GAP : 0);
      if (availW > 0 && availH > 0 && canvas.width > 0 && canvas.height > 0) {
        let scale = Math.min(availW / canvas.width, availH / canvas.height);
        if (scale >= 1) scale = Math.floor(scale);
        const w = Math.max(1, Math.floor(canvas.width * scale));
        const h = Math.max(1, Math.floor(canvas.height * scale));
        const key = `${w}x${h}`;
        if (key !== last) {
          last = key;
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
        }
      }
      raf = requestAnimationFrame(fit); // ゲームが setScreenSize で大きさを変えても追従する
    };
    fit();

    return () => {
      cancelAnimationFrame(raf);
      canvas.style.width = "";
      canvas.style.height = "";
    };
  }, [isFullscreen]);

  const run = async () => {
    if (!data) return;
    setStarted(true); // スタート画面をすぐ消す
    stopScript();
    soundUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    const prepared = await prepareAssets(data.assets);
    soundUrlsRef.current = prepared.soundUrls;
    try {
      await runScript(buildScript(data.code,Number(volume)), prepared);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message !== "stopped") {
        const log = document.getElementById("logBox");
        if (log) log.textContent += "エラー: " + message + "\n";
      }
    }
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
  
  // 実行中のウィンドウに直接音量を反映させる仕組み（例）
  const w = window as any;
  if (typeof w.setGlobalVolume === "function") {
    w.setGlobalVolume(Number(newVol) / 100);
  }
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
        onClick={(e) => { stopScript(); e.currentTarget.blur(); }}
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
            <canvas id="gameScreen" className="ms-canvas" width={400} height={300} />

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
          <pre id="logBox" className="ms-log" />
        </section>
      </div>
    </main>
  );
}
