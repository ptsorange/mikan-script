import { splitCode, compile, validateSyntax, RUNTIME } from "@/lib/lang";
import type { Locale } from "@/lib/i18n";
import { type Asset } from "./assets";
import { toModuleSources } from "./codeFiles";

/* ---------- 実行 ---------- */

/* 作品のコードは、本体ページでは動かさない。
   ここで作るのは「iframe の中で動かす JS の文字列」だけ(動かすのは lib/sandbox.ts の iframe)。
   iframe の中には id="gameScreen"(canvas) があり、ログや大きさの変更は
   window.__ms を通して親に postMessage で伝える。 */
export const buildScript = (code: string, volume: number, assets: Asset[] = [], locale: Locale = "ja") => {
  const v = Number.isFinite(volume) ? Math.min(100, Math.max(0, volume)) : 100;
  validateSyntax(code, "main.code", locale);
  const compiled = compile(splitCode(code), [], toModuleSources(assets), locale, "main.code");

  return `(async () => {
const __lang = ${JSON.stringify(locale)};
const scriptVolume = ${v};
let __activeLoc = { file: "main.code", line: 1 };
const __markErr = (e, loc) => {
  if (e && typeof e === "object" && e.message !== "stopped" && !e.__msLoc) {
    e.__msLoc = loc;
  }
};
const __postErr = (e, loc) => {
  const l = (e && e.__msLoc) || loc || __activeLoc;
  window.__ms.post({
    type: "log",
    level: "error",
    text: String(e && e.message !== undefined ? e.message : e),
    file: l && l.file,
    line: l && l.line,
  });
};
const canvas = document.getElementById("gameScreen");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // 拡大・縮小しても、ピクセルをぼかさない
const addLog = (t) => { window.__ms.post({ type: "log", level: "info", text: String(t) }); };
const addLogLn = (t) => { window.__ms.post({ type: "log", level: "info", text: String(t) + "\\n" }); };
const __warn = (t) => {
  window.__ms.post({
    type: "log",
    level: "warn",
    text: String(t),
    file: __activeLoc && __activeLoc.file,
    line: __activeLoc && __activeLoc.line,
  });
};
const clearLog = () => { window.__ms.post({ type: "clear" }); };
const setScreenSize = (w, h) => {
  canvas.width = w;
  canvas.height = h;
  ctx.imageSmoothingEnabled = false; // canvas の大きさを変えると設定が戻るので、もう一度指定する
  window.__ms.resize(); // iframe の拡大率と、親に伝える大きさを更新する
  draw();
};
const __getTexture = (name) => {
  const img = window.__textures[name];
  if (!img) __warn(__lang === "en" ? ('"' + name + '" was not found. Check the filename in the sidebar.\\n') : ("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n"));
  return img;
};
const __getSound = (name) => {
  const url = window.__soundUrls[name];
  if (!url) __warn(__lang === "en" ? ('"' + name + '" was not found. Check the filename in the sidebar.\\n') : ("「" + name + "」が見つからないよ。左の一覧と同じ名前か、たしかめてね。\\n"));
  return url;
};
${RUNTIME}

window.setGlobalVolume = setGlobalVolume; // 親からの音量変更(postMessage)で使う
setGlobalVolume(scriptVolume / 100);

${compiled}
})().catch((e) => {
  if (e?.message !== "stopped") {
    const l = (e && e.__msLoc) || window.__activeLoc;
    window.__ms.post({
      type: "log",
      level: "error",
      text: String(e && e.message !== undefined ? e.message : e),
      file: l && l.file,
      line: l && l.line,
    });
  }
});`;
};
