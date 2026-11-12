/* 作品のコードを動かす、隔離された iframe の中身(srcdoc に入れる HTML)。

   ■ なぜ iframe か
   作品のコードは「だれが書いたかわからない JS」です。本体ページの中で動かすと、
   ログイン情報(クッキー・localStorage・Supabase のセッション)を読んだり、
   ログイン中のユーザーとして API を叩いたりできてしまいます。

   ■ どう隔離しているか
   1. <iframe sandbox="allow-scripts">(allow-same-origin は付けない)
      → iframe の中は「どこのオリジンでもない」扱いになり、親ページの
        クッキー / localStorage / IndexedDB / DOM に触れません。
   2. この HTML の CSP(下の SANDBOX_CSP)で、外への通信(fetch・画像・フォームなど)を止めます。
   3. 親ページとは postMessage だけで話します。親は届いたメッセージを信用せず、
      型と大きさを確かめてから使います(GameFrame.tsx)。

   このファイルの HTML は固定で、作品のコードは混ざりません。
   コードと素材は、読み込みのあとに postMessage で届き、iframe の中で動きます。 */

// 注意: 下の HTML の <script> の中には、script の終了タグの文字列を書かないこと(HTML がそこで終わってしまう)
export const SANDBOX_ATTR = "allow-scripts";

export const SANDBOX_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'", // 作品のコードは <script> に入れて動かす(eval は使えない)
  "style-src 'unsafe-inline'",
  "img-src data: blob:", // 素材は data / blob だけ。外の画像は読めない
  "media-src data: blob:",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

// String.raw: 中の \n などを、そのまま JS に渡すため
export const SANDBOX_DOC = String.raw`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">
<style>
  /* 親ページ(color-scheme: dark)に合わせる。合っていないと、iframe の背景が白くなる */
  html { color-scheme: dark; }
  html, body { margin: 0; height: 100%; overflow: hidden; background: #1d1f2e; }
  canvas { position: absolute; inset: 0; margin: auto; display: block; image-rendering: pixelated; outline: none; }
</style>
</head>
<body>
<canvas id="gameScreen" width="400" height="300"></canvas>
<script>
(function () {
  "use strict";
  // 作品のコードに上書きされても困らないよう、先に取っておく
  var P = window.parent;
  var canvas = document.getElementById("gameScreen");
  var post = function (m) { P.postMessage(m, "*"); }; // 親のオリジンは「なし」なので "*" にするしかない(中身に秘密はない)

  // 画面の大きさに合わせて canvas を拡大・縮小する(縦横比は保つ)。
  // canvas の見た目の大きさ = 描いている範囲なので、マウス座標もずれない。
  function fit() {
    var s = Math.min(window.innerWidth / canvas.width, window.innerHeight / canvas.height);
    if (!isFinite(s) || s <= 0) return;
    canvas.style.width = Math.max(1, Math.floor(canvas.width * s)) + "px";
    canvas.style.height = Math.max(1, Math.floor(canvas.height * s)) + "px";
  }
  window.addEventListener("resize", fit);

  // 作品のコード(setScreenSize)から使う
  window.__ms = {
    post: post,
    resize: function () {
      fit();
      post({ type: "size", w: canvas.width, h: canvas.height });
    },
  };
  fit();

  // 矢印キーやスペースで、親ページがスクロールしないようにする
  window.addEventListener("keydown", function (e) {
    if (e.key && (e.key.indexOf("Arrow") === 0 || e.key === " ")) e.preventDefault();
  });

  var logError = function (msg) { post({ type: "log", text: "エラー: " + msg + "\n" }); };
  window.addEventListener("error", function (e) { logError(e.message || "不明なエラー"); });
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    var msg = r && r.message !== undefined ? r.message : String(r);
    if (msg !== "stopped") logError(msg);
    e.preventDefault();
  });

  function toBlobUrl(dataUrl) {
    var i = dataUrl.indexOf(",");
    var mime = dataUrl.slice(5, i).split(";")[0];
    var bin = atob(dataUrl.slice(i + 1));
    var bytes = new Uint8Array(bin.length);
    for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  }

  // 画像と音をぜんぶ読み込んでおく
  async function prepare(assets) {
    var textures = Object.create(null);
    var sounds = Object.create(null);
    await Promise.all(assets.map(async function (a) {
      if (!a || typeof a.name !== "string" || typeof a.data !== "string") return;
      if (a.name.indexOf("texture/") === 0) {
        var img = new Image();
        img.src = a.data;
        try { await img.decode(); } catch (e) { /* 読み込めない画像は描かれないだけ */ }
        textures[a.name] = img;
      } else if (a.name.indexOf("sound/") === 0) {
        try { sounds[a.name] = toBlobUrl(a.data); } catch (e) { /* 読み込めない音は鳴らないだけ */ }
      }
    }));
    window.__textures = textures;
    window.__soundUrls = sounds;
  }

  var started = false;
  async function run(m) {
    if (started) return; // 1 つの iframe では 1 回だけ。やり直しは iframe ごと作りなおす
    started = true;
    try {
      await prepare(Array.isArray(m.assets) ? m.assets : []);
      var s = document.createElement("script");
      s.textContent = String(m.js); // DOM で入れるので、コードの中身で HTML が壊れる心配がない
      document.body.appendChild(s);
    } catch (err) {
      logError(err && err.message ? err.message : String(err));
    }
  }

  // 「止める」: RUNTIME の仕組み(__runId と __cleanups)で、動きと音を止める
  function stop() {
    window.__runId = (window.__runId || 0) + 1;
    var fs = window.__cleanups || [];
    window.__cleanups = [];
    fs.forEach(function (f) { try { f(); } catch (e) { /* 止める途中のエラーは無視 */ } });
  }

  window.addEventListener("message", function (e) {
    if (e.source !== P) return;
    var m = e.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "run") run(m);
    else if (m.type === "stop") stop();
    else if (m.type === "volume") {
      if (typeof window.setGlobalVolume === "function") window.setGlobalVolume(Number(m.value));
    } else if (m.type === "capture") {
      var url = "";
      try { url = canvas.toDataURL("image/png"); } catch (err) { /* 取れなければ空 */ }
      post({ type: "capture", id: m.id, dataUrl: url });
    }
  });
})();
</script>
</body>
</html>`;
