/* ゲームの中で動く仕組み(2): 当たり判定 collide() */

export const COLLISION_RUNTIME = `// スプライトの表示サイズと、middle に応じた当たり判定用の矩形を返す
const __spriteSize = (s) => ({
  w: s.__textSprite ? s.w : s.w * (s.size ?? 1),
  h: s.__textSprite ? s.h : s.h * (s.size ?? 1),
});
const __spriteBounds = (s) => {
  const d = __spriteSize(s);
  return {
    x: s.middle ? s.x - d.w / 2 : s.x,
    y: s.middle ? s.y - d.h / 2 : s.y,
    w: d.w,
    h: d.h,
  };
};
const __spriteCenter = (s) => {
  const b = __spriteBounds(s);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
};
// 回転も含めて、スプライトがぜんぶ入る矩形(画像で当たり判定するときの、ざっくりチェック用)
const __rotBounds = (s) => {
  const b = __spriteBounds(s);
  if (s.dontFlip || !s.r) return b; // dontFlip のスプライトは回転して描かれない
  const t = toRadians(s.r);
  const cs = Math.abs(Math.cos(t));
  const sn = Math.abs(Math.sin(t));
  const w = b.w * cs + b.h * sn;
  const h = b.w * sn + b.h * cs;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

// 画像の当たり判定: 重なっている範囲に 2 つのスプライトを実際に描いて、
// どちらも色がついているピクセルが 1 つでもあれば true。
// (回転・反転・大きさ・middle はそのまま反映。ghost などの効果は無視して形だけで見る)
// __renderSprite が描く先。ふだんは本物の canvas。当たり判定のときだけ別の canvas に切りかわる
let __rc = ctx;
let __maskOnly = false; // true のあいだは効果(ghost など)を使わず、形だけ描く
const __maskA = document.createElement("canvas");
const __maskB = document.createElement("canvas");
const __maskCtxA = __maskA.getContext("2d", { willReadFrequently: true });
const __maskCtxB = __maskB.getContext("2d", { willReadFrequently: true });
const __drawMask = (c, s, o, k) => {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = "source-over";
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, __maskA.width, __maskA.height);
  c.setTransform(k, 0, 0, k, -o.x * k, -o.y * k);
  __rc = c;
  __maskOnly = true;
  try { s.draw(); } finally { __rc = ctx; __maskOnly = false; }
  c.setTransform(1, 0, 0, 1, 0, 0);
};
const __pixelHit = (a, b, o) => {
  const k = Math.min(1, Math.sqrt(65536 / (o.w * o.h))); // 広いときは粗くして軽くする
  const W = Math.max(1, Math.ceil(o.w * k));
  const H = Math.max(1, Math.ceil(o.h * k));
  if (__maskA.width !== W || __maskA.height !== H) {
    __maskA.width = W; __maskA.height = H;
    __maskB.width = W; __maskB.height = H;
  }
  try {
    __drawMask(__maskCtxA, a, o, k);
    __drawMask(__maskCtxB, b, o, k);
    __maskCtxA.globalCompositeOperation = "destination-in"; // 両方に色があるところだけ残す
    __maskCtxA.drawImage(__maskB, 0, 0);
    __maskCtxA.globalCompositeOperation = "source-over";
    const d = __maskCtxA.getImageData(0, 0, W, H).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  } catch {
    return true; // 画像が読めなかったときは、矩形で当たったことにする
  }
};

// collide(a, b, type)  type: "rect"(矩形) / "circle"(円) / "img"(画像のピクセル。省略するとこれ)
const collide = (a, b, type = "img") => {
  if (type === "circle") {
    const A = __spriteBounds(a);
    const B = __spriteBounds(b);
    const dx = (A.x + A.w / 2) - (B.x + B.w / 2);
    const dy = (A.y + A.h / 2) - (B.y + B.h / 2);
    const rr = Math.min(A.w, A.h) / 2 + Math.min(B.w, B.h) / 2;
    return dx * dx + dy * dy < rr * rr;
  }
  if (type === "rect") {
    const A = __spriteBounds(a);
    const B = __spriteBounds(b);
    return A.x < B.x + B.w &&
      A.x + A.w > B.x &&
      A.y < B.y + B.h &&
      A.y + A.h > B.y;
  }
  const A = __rotBounds(a);
  const B = __rotBounds(b);
  const x1 = Math.max(A.x, B.x);
  const y1 = Math.max(A.y, B.y);
  const x2 = Math.min(A.x + A.w, B.x + B.w);
  const y2 = Math.min(A.y + A.h, B.y + B.h);
  if (x2 <= x1 || y2 <= y1) return false; // 矩形が重なっていなければ、ピクセルは見ない
  if (typeof a.draw !== "function" || typeof b.draw !== "function") return true; // x,y,w,h だけのオブジェクトは矩形で判定
  return __pixelHit(a, b, { x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
};

`;
