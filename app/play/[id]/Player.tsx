"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { fetchProject, type Asset } from "@/lib/mks";
import type { ProjectInfo } from "@/lib/projects";
import type { TouchControlsConfig } from "@/lib/touchControls";
import GameFrame, { type GameFrameHandle, type LogEntryInput, type LogLevel } from "@/app/_components/GameFrame";
import { useLocale } from "@/app/_components/LocaleProvider";
import { useFullscreen } from "@/app/_components/useFullscreen";
import TouchControls from "./TouchControls";

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる
const MAX_LOG_ITEMS = 300;

type PlayLogItem = {
  id: number;
  level: LogLevel;
  text: string;
  detail?: string;
  file?: string;
  line?: number;
};

/* レイアウト:
     タイトル
     [ 作品(ゲーム画面) ] [ 説明 ]
     [ ログ ]
   タイトルと説明は、長いときは枠を変えずに ... で省略する */
export default function Player({ project }: { project: ProjectInfo }) {
  const { locale, t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<GameFrameHandle>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextLogId = useRef(1);
  const [data, setData] = useState<{ code: string; assets: Asset[]; touchControls?: TouchControlsConfig } | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [entries, setEntries] = useState<PlayLogItem[]>([]);
  const { isFullscreen, pseudoFs, toggle: toggleFullscreen } = useFullscreen(stageRef);
  const [toggleHost, setToggleHost] = useState<HTMLSpanElement | null>(null); // 「タッチ操作設定」ボタンを置く場所(スタートや音量と同じ並び)
  const [panelHost, setPanelHost] = useState<HTMLDivElement | null>(null); // タッチ操作の設定パネルを出す場所(ゲーム画面の外)
  const [volume, setVolume] = useState("100");
  const [size, setSize] = useState({ w: 400, h: 300 }); // 作品の画面の大きさ(setScreenSize で変わる)
  const [fsBox, setFsBox] = useState<{ w: number; h: number } | null>(null); // 全画面での表示サイズ

  // 作品を読み込む。ページを離れるときは、ゲームも音も止める
  useEffect(() => {
    let alive = true;
    fetchProject(project.id, project.version, locale)
      .then((p) => alive && setData({ code: p.code, assets: p.assets, touchControls: p.meta.touchControls }))
      .catch((e) => alive && setError(e instanceof Error ? e.message : String(e)));

    return () => {
      alive = false;
      // ゲームと音は、iframe がページと一緒に消えるので止まる
    };
  }, [project.id, project.version, locale]);

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
    // スタート後にコントロールバーが現れても高さが変わるので、バーの大きさも見る
    const bar = stage.querySelector<HTMLElement>(".ms-controls");
    if (bar) ro.observe(bar);
    // スマホはアドレスバーの出し入れや回転で表示領域が変わる
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, [isFullscreen, started, size]);

  // スマホで、ゲーム画面の上のピンチ拡大縮小・ダブルタップ拡大・テキスト選択が起きないようにする。
  // (CSS の touch-action / user-select が効かない iOS Safari 用に、イベントでも止める)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const stop = (e: Event) => e.preventDefault();
    const stopMulti = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    stage.addEventListener("gesturestart", stop);
    stage.addEventListener("gesturechange", stop);
    stage.addEventListener("touchmove", stopMulti, { passive: false });
    stage.addEventListener("selectstart", stop);
    stage.addEventListener("contextmenu", stop);
    return () => {
      stage.removeEventListener("gesturestart", stop);
      stage.removeEventListener("gesturechange", stop);
      stage.removeEventListener("touchmove", stopMulti);
      stage.removeEventListener("selectstart", stop);
      stage.removeEventListener("contextmenu", stop);
    };
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const appendEntry = useCallback((entry: LogEntryInput) => {
    setEntries((prev) => {
      if (entry.level === "info" && prev.length > 0 && prev[prev.length - 1].level === "info") {
        const last = prev[prev.length - 1];
        const merged = last.text + entry.text;
        const trimmed = merged.length > MAX_LOG_CHARS ? merged.slice(-MAX_LOG_CHARS) : merged;
        return [...prev.slice(0, -1), { ...last, text: trimmed }];
      }
      const next: PlayLogItem = {
        id: nextLogId.current++,
        level: entry.level,
        text: entry.level === "info" && entry.text.length > MAX_LOG_CHARS ? entry.text.slice(-MAX_LOG_CHARS) : entry.text,
        detail: entry.detail,
        file: entry.file,
        line: entry.line,
      };
      const updated = [...prev, next];
      return updated.length > MAX_LOG_ITEMS ? updated.slice(-MAX_LOG_ITEMS) : updated;
    });
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  const errorCount = entries.filter((e) => e.level === "error").length;

  const run = () => {
    if (!data) return;
    setStarted(true); // スタート画面をすぐ消す
    frameRef.current?.run(data.code, data.assets, Number(volume));
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
        {started ? t.play.restart : t.play.start}
      </button>
      <button
        className="ms-btn ms-btn-red"
        disabled={!started}
        onClick={(e) => { frameRef.current?.stop(); e.currentTarget.blur(); }}
      >
        {t.play.stop}
      </button>
      <button className="ms-btn" onClick={(e) => { toggleFullscreen(); e.currentTarget.blur(); }}>
        {isFullscreen ? t.play.exitFullscreen : t.play.fullscreen}
      </button>
      <span className="ms-controls-slot" ref={setToggleHost} />
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
        {project.author && <p className="ms-play-author ms-ellipsis">{t.play.author(project.author)}</p>}
      </div>

      <div className="ms-play-grid">
        {/* 作品 */}
        <section className="ms-stage" aria-label={t.play.stageAria}>
          {!isFullscreen && controls}

          <div className={`ms-screen${pseudoFs ? " is-pseudo-fs" : ""}`} ref={stageRef}>
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
              onLogEntry={appendEntry}
              onClearLog={clearLog}
              onSize={(w, h) => setSize({ w, h })}
            />

            {!started && (
              <div className="ms-start" style={thumbStyle}>
                <div className="ms-start-inner">
                  {error ? (
                    <p role="alert" className="ms-error">
                      {t.play.loadError(error)}
                    </p>
                  ) : (
                    <>
                      <button
                        ref={startRef}
                        className="ms-btn ms-btn-green ms-btn-big"
                        disabled={!data}
                        onClick={run}
                      >
                        {data ? t.play.start : t.play.loading}
                      </button>
                      <p className="ms-start-hint">{t.play.startHint}</p>
                    </>
                  )}
                </div>
              </div>
            )}
            <TouchControls
              projectId={project.id}
              started={started}
              layoutKey={`${size.w}:${size.h}:${isFullscreen}:${fsBox?.w ?? 0}:${fsBox?.h ?? 0}`}
              defaultTouchControls={data ? data.touchControls : project.touchControls}
              stageRef={stageRef}
              frameRef={frameRef}
              panelHost={panelHost}
              toggleHost={toggleHost}
              isFullscreen={isFullscreen}
              onExitFullscreen={toggleFullscreen}
            />
          </div>

          {/* タッチ操作の設定パネルは、ゲーム画面に重ならないよう、ここ(画面のすぐ下)に出す */}
          <div className="ms-touch-host" ref={setPanelHost} />
        </section>

        {/* 説明 */}
        <aside className="ms-panel ms-side" aria-label={t.play.sideAria}>
          <div className="ms-side-inner">
            <h2>{t.play.descriptionHeading}</h2>
            <p className="ms-side-desc" title={project.description || undefined}>
              {project.description || t.play.noDescription}
            </p>
            <div className="ms-side-actions">
              <Link href={`/make?load=${id}`} className="ms-btn ms-btn-blue">
                {t.play.remix}
              </Link>
              <a href={`/projects/${id}.mks`} download className="ms-btn">
                {t.play.download}
              </a>
            </div>
          </div>
        </aside>

        {/* ログ */}
        <section className="ms-panel ms-log-panel" aria-label={t.play.logAria}>
          <div className="ms-log-head">
            <h2>{t.play.logHeading}</h2>
            {errorCount > 0 && <span className="ms-log-count">{t.play.errorCount(errorCount)}</span>}
            <button
              type="button"
              className="ms-btn ms-log-clear"
              onClick={clearLog}
              disabled={entries.length === 0}
            >
              {t.play.clearLog}
            </button>
          </div>
          <div ref={logRef} className="ms-log" role="log" aria-live="polite">
            {entries.map((item) => {
              if (item.level === "info") {
                return (
                  <pre key={item.id} className="ms-log-info">
                    {item.text}
                  </pre>
                );
              }
              const isError = item.level === "error";
              return (
                <div
                  key={item.id}
                  className={`ms-log-entry ${isError ? "is-error" : "is-warn"}`}
                  role={isError ? "alert" : undefined}
                >
                  <div className="ms-log-meta">
                    <span className={`ms-log-badge ${isError ? "is-error" : "is-warn"}`}>
                      {isError ? t.play.errorBadge : t.play.warnBadge}
                    </span>
                    {item.file && item.line && (
                      <span className="ms-log-loc">{t.play.lineLabel(item.file, item.line)}</span>
                    )}
                  </div>
                  <p className="ms-log-msg">{item.text.trimEnd()}</p>
                  {item.detail && item.detail !== item.text && <p className="ms-log-detail">{item.detail}</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
