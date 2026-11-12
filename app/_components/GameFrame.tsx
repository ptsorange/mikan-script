"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { buildScript, type Asset } from "@/lib/mks";
import { SANDBOX_ATTR, SANDBOX_DOC } from "@/lib/sandbox";

/* 作品を動かす画面。隔離された iframe(lib/sandbox.ts)の中でコードを動かす。
   「あそぶ」ページとエディタで共通。

   iframe から届くメッセージは「作品のコードが送ってきたもの」なので信用しない。
   型・長さ・大きさを確かめてから使う。 */

export type GameFrameHandle = {
  /** 最初から動かす(iframe を作りなおすので、前の実行は全部消える) */
  run: (code: string, assets: Asset[], volume: number) => void;
  /** 動きと音を止める(最後の画面は残る) */
  stop: () => void;
  /** 音量 0〜100 */
  setVolume: (volume: number) => void;
  /** いまの画面を PNG の data URL で返す(取れなければ null) */
  capture: () => Promise<string | null>;
  /** キー入力が作品に届くように、iframe にフォーカスする */
  focus: () => void;
};

type Props = {
  ref?: Ref<GameFrameHandle>;
  className?: string;
  style?: CSSProperties;
  onLog?: (text: string) => void;
  onClearLog?: () => void;
  /** 作品の画面の大きさ(setScreenSize で変わる)が変わったとき */
  onSize?: (w: number, h: number) => void;
};

const DEFAULT_SIZE = { w: 400, h: 300 };
const MAX_LOG_CHARS = 2000; // 1 回のメッセージの上限
const MAX_LOGS_PER_SEC = 200; // ログを大量に送りつけられても、親が固まらないように
const MAX_DATA_URL = 20 * 1024 * 1024;
const PNG_PREFIX = "data:image/png;base64,";

const clampSize = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(4096, Math.max(1, n)) : null;
};

export default function GameFrame({ ref, className, style, onLog, onClearLog, onSize }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef<{ js: string; assets: Asset[] } | null>(null);
  const captures = useRef(new Map<number, (v: string | null) => void>());
  const captureId = useRef(0);
  const rate = useRef({ at: 0, count: 0 });
  const handlers = useRef({ onLog, onClearLog, onSize });
  const [runId, setRunId] = useState(0); // 変えると iframe が作りなおされる
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    handlers.current = { onLog, onClearLog, onSize };
  });

  const send = (message: Record<string, unknown>) =>
    // 親のオリジンと違い、iframe は「オリジンなし」なので targetOrigin は "*" にするしかない
    frameRef.current?.contentWindow?.postMessage(message, "*");

  useEffect(() => {
    const pendingCaptures = captures.current;
    const onMessage = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const m = e.data as Record<string, unknown> | null;
      if (!m || typeof m !== "object") return;

      if (m.type === "log" && typeof m.text === "string") {
        const now = Date.now();
        if (now - rate.current.at > 1000) rate.current = { at: now, count: 0 };
        if (++rate.current.count > MAX_LOGS_PER_SEC) return;
        handlers.current.onLog?.(m.text.slice(0, MAX_LOG_CHARS));
      } else if (m.type === "clear") {
        handlers.current.onClearLog?.();
      } else if (m.type === "size") {
        const w = clampSize(m.w);
        const h = clampSize(m.h);
        if (w && h) {
          setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
          handlers.current.onSize?.(w, h);
        }
      } else if (m.type === "capture" && typeof m.id === "number") {
        const done = pendingCaptures.get(m.id);
        pendingCaptures.delete(m.id);
        const ok =
          typeof m.dataUrl === "string" &&
          m.dataUrl.startsWith(PNG_PREFIX) &&
          m.dataUrl.length <= MAX_DATA_URL;
        done?.(ok ? (m.dataUrl as string) : null);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      pendingCaptures.forEach((done) => done(null));
      pendingCaptures.clear();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    run(code, assets, volume) {
      handlers.current.onClearLog?.();
      try {
        pending.current = { js: buildScript(code, volume), assets };
      } catch (e) {
        handlers.current.onLog?.("エラー: " + (e instanceof Error ? e.message : String(e)) + "\n");
        return;
      }
      setSize(DEFAULT_SIZE);
      handlers.current.onSize?.(DEFAULT_SIZE.w, DEFAULT_SIZE.h);
      setRunId((n) => n + 1); // 新しい iframe が読み込まれたら、onLoad で中身を送る
    },
    stop() {
      send({ type: "stop" });
    },
    setVolume(volume) {
      send({ type: "volume", value: volume / 100 });
    },
    capture() {
      return new Promise((resolve) => {
        if (!frameRef.current?.contentWindow) return resolve(null);
        const id = ++captureId.current;
        captures.current.set(id, resolve);
        send({ type: "capture", id });
        setTimeout(() => {
          if (captures.current.delete(id)) resolve(null);
        }, 3000);
      });
    },
    focus() {
      frameRef.current?.focus();
    },
  }));

  const onLoad = () => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    send({ type: "run", js: p.js, assets: p.assets });
    frameRef.current?.focus();
  };

  return (
    <iframe
      key={runId}
      ref={frameRef}
      title="ゲーム画面"
      className={className}
      // allow-same-origin は付けない(付けると、中のコードが親のクッキーや保存データに触れてしまう)
      sandbox={SANDBOX_ATTR}
      allow="autoplay"
      referrerPolicy="no-referrer"
      srcDoc={SANDBOX_DOC}
      onLoad={onLoad}
      // 画面の大きさ(縦横比)のまま、親の幅に収まるように縮める。呼び出し側の style で上書きできる
      style={{ width: `min(${size.w}px, 100%)`, aspectRatio: `${size.w} / ${size.h}`, ...style }}
    />
  );
}
