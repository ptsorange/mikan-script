"use client";

import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { formatMikanError, MikanScriptError } from "@/lib/lang";
import { buildScript, kindOf, type Asset } from "@/lib/mks";
import { SANDBOX_ATTR, SANDBOX_DOC } from "@/lib/sandbox";
import { useLocale } from "./LocaleProvider";

/* 作品を動かす画面。隔離された iframe(lib/sandbox.ts)の中でコードを動かす。
   「あそぶ」ページとエディタで共通。

   iframe から届くメッセージは「作品のコードが送ってきたもの」なので信用しない。
   型・長さ・大きさを確かめてから使う。 */

export type LogLevel = "info" | "warn" | "error";

export type LogEntryInput = {
  level: LogLevel;
  text: string;
  detail?: string;
  file?: string;
  line?: number;
};

export type GameFrameHandle = {
  /** 最初から動かす(iframe を作りなおすので、前の実行は全部消える) */
  run: (code: string, assets: Asset[], volume: number) => void;
  /** 動きと音を止める(最後の画面は残る) */
  stop: () => void;
  /** 音量 0〜100 */
  setVolume: (volume: number) => void;
  /** タッチ操作からキー入力を送る */
  pressKey: (key: string, pressed: boolean) => void;
  /** タッチ操作からマウスボタン入力を送る。座標は 0〜1 */
  pressMouse: (button: "left" | "middle" | "right", pressed: boolean, x: number, y: number) => void;
  /** タッチ操作からマウス座標を動かす。座標は 0〜1 */
  moveMouse: (x: number, y: number) => void;
  /** iframe の画面上の位置 */
  getBounds: () => Pick<DOMRect, "left" | "top" | "width" | "height"> | null;
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
  onLogEntry?: (entry: LogEntryInput) => void;
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

const clampLine = (v: unknown): number | undefined => {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.floor(v);
  return n >= 1 && n <= 1_000_000 ? n : undefined;
};

export default function GameFrame({ ref, className, style, onLog, onLogEntry, onClearLog, onSize }: Props) {
  const { locale, t } = useLocale();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef<{ js: string; assets: Asset[]; lang: string } | null>(null);
  const captures = useRef(new Map<number, (v: string | null) => void>());
  const captureId = useRef(0);
  const rate = useRef({ at: 0, count: 0 });
  const handlers = useRef({ onLog, onLogEntry, onClearLog, onSize });
  const localeRef = useRef({ locale, errorPrefix: t.gameFrame.errorPrefix });
  const [runId, setRunId] = useState(0); // 変えると iframe が作りなおされる
  const [size, setSize] = useState(DEFAULT_SIZE);

  useEffect(() => {
    handlers.current = { onLog, onLogEntry, onClearLog, onSize };
    localeRef.current = { locale, errorPrefix: t.gameFrame.errorPrefix };
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

        const rawText = m.text.slice(0, MAX_LOG_CHARS);
        const level: LogLevel = m.level === "error" || m.level === "warn" ? m.level : "info";
        const file = typeof m.file === "string" && m.file.length <= 160 ? m.file : undefined;
        const line = clampLine(m.line);

        if (level === "error") {
          const formatted = formatMikanError(rawText, localeRef.current.locale);
          handlers.current.onLogEntry?.({
            level: "error",
            text: formatted.message,
            detail: formatted.detail,
            file,
            line,
          });
          handlers.current.onLog?.(localeRef.current.errorPrefix + formatted.message + "\n");
        } else {
          handlers.current.onLogEntry?.({ level, text: rawText, file, line });
          handlers.current.onLog?.(rawText);
        }
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
        // コードファイル(code/*.code)は、ここで 1 本の JS にまとめる。iframe には画像と音だけ送る
        pending.current = {
          js: buildScript(code, volume, assets, localeRef.current.locale),
          assets: assets.filter((a) => kindOf(a.name) !== "code"),
          lang: localeRef.current.locale,
        };
      } catch (e) {
        if (e instanceof MikanScriptError) {
          handlers.current.onLogEntry?.({
            level: "error",
            text: e.message,
            detail: e.detail,
            file: e.file,
            line: e.line,
          });
          handlers.current.onLog?.(localeRef.current.errorPrefix + e.message + "\n");
        } else {
          const raw = e instanceof Error ? e.message : String(e);
          const formatted = formatMikanError(raw, localeRef.current.locale);
          handlers.current.onLogEntry?.({
            level: "error",
            text: formatted.message,
            detail: formatted.detail,
          });
          handlers.current.onLog?.(localeRef.current.errorPrefix + formatted.message + "\n");
        }
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
    pressKey(key, pressed) {
      if (typeof key !== "string" || !key || key.length > 32) return;
      send({ type: "input", inputType: "key", action: pressed ? "down" : "up", key });
    },
    pressMouse(button, pressed, x, y) {
      if (button !== "left" && button !== "middle" && button !== "right") return;
      send({
        type: "input",
        inputType: "mouse",
        action: pressed ? "down" : "up",
        button,
        x: Math.max(0, Math.min(1, Number(x) || 0)),
        y: Math.max(0, Math.min(1, Number(y) || 0)),
      });
    },
    moveMouse(x, y) {
      send({
        type: "input",
        inputType: "mouse",
        action: "move",
        x: Math.max(0, Math.min(1, Number(x) || 0)),
        y: Math.max(0, Math.min(1, Number(y) || 0)),
      });
    },
    getBounds() {
      const rect = frameRef.current?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
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
    send({ type: "run", js: p.js, assets: p.assets, lang: p.lang });
    frameRef.current?.focus();
  };

  return (
    <iframe
      key={runId}
      ref={frameRef}
      title={t.gameFrame.title}
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
