"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ChangeEvent, type Ref } from "react";
import GameFrame, { type GameFrameHandle, type LogEntryInput, type LogLevel } from "@/app/_components/GameFrame";
import { useLocale } from "@/app/_components/LocaleProvider";
import { useFullscreen } from "@/app/_components/useFullscreen";
import type { Asset } from "@/lib/mks";

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる
const MAX_LOG_ITEMS = 300;

export type StageLogItem = {
  id: number;
  level: LogLevel;
  text: string;
  detail?: string;
  file?: string;
  line?: number;
};

export type StageHandle = {
  /** 最初から動かす(音量は、いまのスライダーの値) */
  run: (code: string, assets: Asset[]) => void;
  /** いまの画面を PNG の data URL で返す(取れなければ null) */
  capture: () => Promise<string | null>;
};

type Props = {
  ref?: Ref<StageHandle>;
  onRun: () => void; // 「実行」ボタン(コードと画像・音を渡すのは呼ぶ側の仕事)
  onNotice: (msg: string) => void;
  onError?: (err: { file?: string; line?: number; message: string }) => void;
  onJumpToLocation?: (file: string, line: number) => void;
};

type ControlsProps = {
  fullscreen: boolean;
  volume: string;
  onRun: () => void;
  onStop: () => void;
  onToggleFullscreen: () => void;
  onVolumeChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

// 実行・止める・フルスクリーン・音量(全画面のときも同じものを出す)
function Controls({ fullscreen, volume, onRun, onStop, onToggleFullscreen, onVolumeChange }: ControlsProps) {
  const { t } = useLocale();
  return (
    <div className={`kc-controls${fullscreen ? " mr-auto" : ""}`}>
      <button
        className="kc-btn kc-run"
        onClick={(e) => {
          onRun();
          e.currentTarget.blur();
        }}
      >
        {t.editor.stage.run}
      </button>
      <button className="kc-btn kc-stop" onClick={onStop}>
        {t.editor.stage.stop}
      </button>
      <button
        className="kc-btn"
        onClick={(e) => {
          onToggleFullscreen();
          e.currentTarget.blur();
        }}
      >
        {fullscreen ? t.editor.stage.exitFullscreen : t.editor.stage.fullscreen}
      </button>
      <input
        type="range"
        className={fullscreen ? undefined : "w-[75]"}
        value={volume}
        onChange={onVolumeChange}
        min="0"
        max="100"
        step="1"
      />
    </div>
  );
}

// 右側: 作品が動く画面とログ
export default function Stage({ ref, onRun, onError, onJumpToLocation }: Props) {
  const { t } = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<GameFrameHandle>(null); // 作品を動かす iframe(隔離された画面)
  const logRef = useRef<HTMLDivElement>(null);
  const nextLogId = useRef(1);
  const onErrorRef = useRef(onError);
  const { isFullscreen, pseudoFs, toggle: toggleFullscreen } = useFullscreen(stageRef);
  const [volume, setVolume] = useState("100");
  const [entries, setEntries] = useState<StageLogItem[]>([]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  useImperativeHandle(
    ref,
    () => ({
      run: (code, assets) => frameRef.current?.run(code, assets, Number(volume)),
      capture: async () => (await frameRef.current?.capture()) ?? null,
    }),
    [volume]
  );

  // 動いているゲームの音量を、すぐに変える(iframe の中に postMessage で伝える)
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = e.target.value;
    setVolume(newVol);
    frameRef.current?.setVolume(Number(newVol));
  };

  // 止めると、鳴っている音も止まる
  const stopCode = () => frameRef.current?.stop();

  const appendEntry = useCallback((entry: LogEntryInput) => {
    if (entry.level === "error") {
      onErrorRef.current?.({
        file: entry.file,
        line: entry.line,
        message: entry.text,
      });
    }

    setEntries((prev) => {
      if (entry.level === "info" && prev.length > 0 && prev[prev.length - 1].level === "info") {
        const last = prev[prev.length - 1];
        const merged = last.text + entry.text;
        const trimmed = merged.length > MAX_LOG_CHARS ? merged.slice(-MAX_LOG_CHARS) : merged;
        return [...prev.slice(0, -1), { ...last, text: trimmed }];
      }
      const next: StageLogItem = {
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

  const controls = (fullscreen: boolean) => (
    <Controls
      fullscreen={fullscreen}
      volume={volume}
      onRun={onRun}
      onStop={stopCode}
      onToggleFullscreen={toggleFullscreen}
      onVolumeChange={handleVolumeChange}
    />
  );

  return (
    <section className="kc-stage" aria-label={t.editor.stage.sectionAria}>
      {controls(false)}

      <div className={`kc-screen${pseudoFs ? " is-pseudo-fs" : ""}`} ref={stageRef}>
        {isFullscreen ? controls(true) : null}
        <GameFrame
          ref={frameRef}
          className="kc-canvas"
          // 全画面では、CSS(.kc-screen:fullscreen .kc-canvas)で高さいっぱいに広げる
          style={isFullscreen ? { width: "auto", height: "auto" } : undefined}
          onLogEntry={appendEntry}
          onClearLog={clearLog}
        />
      </div>

      <div className="kc-log-head">
        <h2 className="kc-side-title">{t.editor.stage.logHeading}</h2>
        {errorCount > 0 && <span className="kc-log-count">{t.editor.stage.errorCount(errorCount)}</span>}
        <button
          type="button"
          className="kc-btn kc-log-clear"
          onClick={clearLog}
          disabled={entries.length === 0}
        >
          {t.editor.stage.clearLog}
        </button>
      </div>

      <div ref={logRef} className="kc-log" role="log" aria-live="polite">
        {entries.map((item) => {
          if (item.level === "info") {
            return (
              <pre key={item.id} className="kc-log-info">
                {item.text}
              </pre>
            );
          }
          const isError = item.level === "error";
          return (
            <div
              key={item.id}
              className={`kc-log-entry ${isError ? "is-error" : "is-warn"}`}
              role={isError ? "alert" : undefined}
            >
              <div className="kc-log-meta">
                <span className={`kc-log-badge ${isError ? "is-error" : "is-warn"}`}>
                  {isError ? t.editor.stage.errorBadge : t.editor.stage.warnBadge}
                </span>
                {item.file && item.line && (
                  <button
                    type="button"
                    className="kc-log-loc"
                    title={t.editor.stage.jumpTitle(item.file, item.line)}
                    onClick={() => onJumpToLocation?.(item.file!, item.line!)}
                  >
                    {t.editor.stage.lineLabel(item.file, item.line)}
                  </button>
                )}
              </div>
              <p className="kc-log-msg">{item.text.trimEnd()}</p>
              {item.detail && item.detail !== item.text && <p className="kc-log-detail">{item.detail}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
