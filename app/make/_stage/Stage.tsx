"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ChangeEvent, type Ref } from "react";
import GameFrame, { type GameFrameHandle } from "@/app/_components/GameFrame";
import type { Asset } from "@/lib/mks";

const MAX_LOG_CHARS = 20000; // ログが増えすぎて重くならないように、古い分から捨てる

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
  return (
    <div className={`kc-controls${fullscreen ? " mr-auto" : ""}`}>
      <button
        className="kc-btn kc-run"
        onClick={(e) => {
          onRun();
          e.currentTarget.blur();
        }}
      >
        ▶ 実行
      </button>
      <button className="kc-btn kc-stop" onClick={onStop}>
        ■ 止める
      </button>
      <button
        className="kc-btn"
        onClick={(e) => {
          onToggleFullscreen();
          e.currentTarget.blur();
        }}
      >
        {fullscreen ? "🗗 もどす" : "⛶ フルスクリーン"}
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
export default function Stage({ ref, onRun, onNotice }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<GameFrameHandle>(null); // 作品を動かす iframe(隔離された画面)
  const logRef = useRef<HTMLPreElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState("100");

  useImperativeHandle(
    ref,
    () => ({
      run: (code, assets) => frameRef.current?.run(code, assets, Number(volume)),
      capture: async () => (await frameRef.current?.capture()) ?? null,
    }),
    [volume]
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      onNotice("フルスクリーンにできなかったよ。");
    }
  };

  // 動いているゲームの音量を、すぐに変える(iframe の中に postMessage で伝える)
  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVol = e.target.value;
    setVolume(newVol);
    frameRef.current?.setVolume(Number(newVol));
  };

  // 止めると、鳴っている音も止まる
  const stopCode = () => frameRef.current?.stop();

  const appendLog = (text: string) => {
    const el = logRef.current;
    if (!el) return;
    const next = el.textContent + text;
    el.textContent = next.length > MAX_LOG_CHARS ? next.slice(-MAX_LOG_CHARS) : next;
  };
  const clearLog = () => {
    if (logRef.current) logRef.current.textContent = "";
  };

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
    <section className="kc-stage" aria-label="ステージ">
      {controls(false)}

      <div className="kc-screen" ref={stageRef}>
        {isFullscreen ? controls(true) : null}
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
  );
}
