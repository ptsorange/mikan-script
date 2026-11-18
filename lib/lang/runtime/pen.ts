/* ゲームの中で動く仕組み(3): ペン */

export const PEN_RUNTIME = `// ---------- ペン(スクラッチのペンみたいに、描いたものが残る) ----------
// スプライトは毎フレーム描きなおすが、ペンの絵は専用の canvas に残しておき、
// draw() のとき、スプライトの下に貼る。ペンを使わないゲームでは何も増えない。
const __pen = document.createElement("canvas");
const __penCtx = __pen.getContext("2d");
let __penUsed = false;
let __penCol = "black";
let __penW = 1;
let __looping = false;   // 毎フレーム描く仕組みが動いているか(スプライトがあるとき)
let __penQueued = false;
// ペン用 canvas を、画面と同じ大きさにそろえる(setScreenSize のあとも、描いた絵は残す)
const __penFit = () => {
  if (__pen.width === canvas.width && __pen.height === canvas.height) return;
  let old = null;
  if (__penUsed) {
    old = document.createElement("canvas");
    old.width = __pen.width; old.height = __pen.height;
    old.getContext("2d").drawImage(__pen, 0, 0);
  }
  __pen.width = canvas.width;
  __pen.height = canvas.height;
  __penCtx.imageSmoothingEnabled = false;
  if (old) __penCtx.drawImage(old, 0, 0);
};
const __penStart = () => {
  __penFit();
  __penUsed = true;
  return __penCtx;
};
// 毎フレーム描く仕組みがない(スプライトがない)ときは、次のフレームで 1 回だけ描きなおす
const __penChanged = () => {
  if (__looping || __penQueued) return;
  __penQueued = true;
  requestAnimationFrame(() => {
    __penQueued = false;
    if (window.__runId === __id) draw();
  });
};
const __penPaint = () => {
  if (!__penUsed) return;
  __penFit();
  if (__pen.width > 0 && __pen.height > 0) ctx.drawImage(__pen, 0, 0);
};
const __nums = (...v) => v.every((n) => Number.isFinite(n));

const penColor = (c) => { __penCol = String(c); };
const penSize = (n) => { n = Number(n); if (Number.isFinite(n)) __penW = Math.max(0.1, n); };
const penDot = (x, y) => {
  x = Number(x); y = Number(y);
  if (!__nums(x, y)) return;
  const c = __penStart();
  c.fillStyle = __penCol;
  c.beginPath();
  c.arc(x, y, __penW / 2, 0, Math.PI * 2);
  c.fill();
  __penChanged();
};
const penLine = (x1, y1, x2, y2) => {
  x1 = Number(x1); y1 = Number(y1); x2 = Number(x2); y2 = Number(y2);
  if (!__nums(x1, y1, x2, y2)) return;
  const c = __penStart();
  c.strokeStyle = __penCol;
  c.lineWidth = __penW;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
  __penChanged();
};
const penRect = (x, y, w, h) => {
  x = Number(x); y = Number(y); w = Number(w); h = Number(h);
  if (!__nums(x, y, w, h)) return;
  const c = __penStart();
  c.fillStyle = __penCol;
  c.fillRect(x, y, w, h);
  __penChanged();
};
const penCircle = (x, y, r) => {
  x = Number(x); y = Number(y); r = Number(r);
  if (!__nums(x, y, r) || r < 0) return;
  const c = __penStart();
  c.fillStyle = __penCol;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  __penChanged();
};
const penClear = () => {
  if (!__penUsed) return;
  __penFit();
  __penCtx.clearRect(0, 0, __pen.width, __pen.height);
  __penChanged();
};

`;
