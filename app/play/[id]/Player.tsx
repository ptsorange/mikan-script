"use client";

import { useEffect, useRef, useState } from "react";
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
import "./player.css";

export default function Player({ project }: { project: ProjectInfo }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const soundUrlsRef = useRef<string[]>([]);
  const [data, setData] = useState<{ code: string; assets: Asset[] } | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const run = async () => {
    if (!data) return;
    stopScript();
    soundUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    const prepared = await prepareAssets(data.assets);
    soundUrlsRef.current = prepared.soundUrls;
    setStarted(true);
    // canvas と logBox が画面に出てから動かす
    await new Promise((r) => requestAnimationFrame(r));
    try {
      await runScript(buildScript(data.code), prepared);
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

  const btn = "rounded-full px-5 py-2 text-sm font-bold text-white shadow-[0_3px_0_rgba(0,0,0,0.28)] active:translate-y-0.5";

  const controls = (
    <div className="flex flex-wrap gap-2">
      <button className={`${btn} bg-green-600 hover:bg-green-500`} onClick={(e) => { run(); e.currentTarget.blur(); }}>
        {started ? "↻ さいしょから" : "▶ スタート"}
      </button>
      <button className={`${btn} bg-red-600 hover:bg-red-500`} onClick={(e) => { stopScript(); e.currentTarget.blur(); }}>
        ■ 止める
      </button>
      <button className={`${btn} bg-slate-600 hover:bg-slate-500`} onClick={(e) => { toggleFullscreen(); e.currentTarget.blur(); }}>
        {isFullscreen ? "🗗 もどす" : "⛶ フルスクリーン"}
      </button>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <nav className="mb-4 flex items-center justify-between text-sm">
        <Link href="/" className="underline opacity-70 hover:opacity-100">← ホームにもどる</Link>
        <Link
          href={`/make?load=${encodeURIComponent(project.id)}`}
          className="rounded-full bg-purple-600 px-4 py-1.5 font-bold text-white hover:bg-purple-500"
        >
          ✎ 改造する
        </Link>
      </nav>

      <h1 className="text-2xl font-bold break-words">{project.title}</h1>
      {project.author && <p className="text-xs opacity-60">作った人: {project.author}</p>}
      {project.description && <p className="mt-2 text-sm opacity-80 break-words">{project.description}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {error ? (
          <p role="alert" className="text-red-500">読み込めなかったよ: {error}</p>
        ) : !data ? (
          <p className="opacity-70">よみこみ中…</p>
        ) : (
          <>
            {controls}
            <div className="pl-screen" ref={stageRef}>
              {isFullscreen && <div className="mr-auto mb-3">{controls}</div>}
              <canvas id="gameScreen" className="pl-canvas" width={400} height={300} />
            </div>
            {!started && (
              <p className="text-sm opacity-60">「スタート」を押すと、ゲームがはじまるよ。(音が出るよ)</p>
            )}
            <pre id="logBox" className="pl-log" />
          </>
        )}
      </div>
    </main>
  );
}
