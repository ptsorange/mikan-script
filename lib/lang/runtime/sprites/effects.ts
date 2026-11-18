/* スプライトの仕組み(2): 効果(色・魚眼・渦巻き など) */

export const EFFECTS_RUNTIME = `// ---------- 効果(スクラッチと同じ 7 つ。0 のときは何もしない) ----------
// color: 色相 / fisheye: 魚眼レンズ / whirl: 渦巻き / pixelate: ピクセル化
// mosaic: モザイク(同じ絵を並べる) / brightness: 明るさ(-100〜100) / ghost: 幽霊(0〜100)
const __EFFECT_NAMES = ["color", "fisheye", "whirl", "pixelate", "mosaic", "brightness", "ghost"];
const __EFFECT_ALIAS = Object.assign(Object.create(null), {
  "色": "color", "魚眼レンズ": "fisheye", "魚眼": "fisheye", "渦巻き": "whirl",
  "ピクセル化": "pixelate", "モザイク": "mosaic", "明るさ": "brightness", "幽霊": "ghost",
});
const __newEffects = () => ({ color: 0, fisheye: 0, whirl: 0, pixelate: 0, mosaic: 0, brightness: 0, ghost: 0 });
const __effectName = (n) => {
  const k = __EFFECT_ALIAS[n] ?? n;
  return __EFFECT_NAMES.includes(k) ? k : null;
};
const __hasPixelFx = (e) => !!(e.color || e.fisheye || e.whirl || e.pixelate || e.mosaic || e.brightness);

const __fxCanvas = document.createElement("canvas");
const __fxCtx = __fxCanvas.getContext("2d", { willReadFrequently: true });
const __rgb = [0, 0, 0];
// 色相をずらす(真っ黒や灰色でも変化が見えるよう、スクラッチと同じ下限を入れる)
const __shiftHue = (r, g, b, dh) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = mx === 0 ? 0 : d / mx, v = mx;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  if (v < 0.055) { h = 0; s = 1; v = 0.055; }
  else if (s < 0.09) { h = 0; s = 0.09; }
  h = (h + dh) % 1;
  if (h < 0) h += 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: __rgb[0] = v; __rgb[1] = t; __rgb[2] = p; break;
    case 1: __rgb[0] = q; __rgb[1] = v; __rgb[2] = p; break;
    case 2: __rgb[0] = p; __rgb[1] = v; __rgb[2] = t; break;
    case 3: __rgb[0] = p; __rgb[1] = q; __rgb[2] = v; break;
    case 4: __rgb[0] = t; __rgb[1] = p; __rgb[2] = v; break;
    default: __rgb[0] = v; __rgb[1] = p; __rgb[2] = q;
  }
  __rgb[0] *= 255; __rgb[1] *= 255; __rgb[2] *= 255;
};

// いったん小さな canvas にスプライトを描いて、1 ピクセルずつ加工してから本物の canvas へ貼る。
// paint(c) は「中心が (0,0)、大きさ sw x sh」でスプライトを描く関数。
const __drawFx = (e, sw, sh, paint) => {
  const aw = Math.abs(sw), ah = Math.abs(sh);
  const k = Math.min(1, Math.sqrt(262144 / (aw * ah))); // 大きすぎるときは粗くして軽くする
  const W = Math.max(1, Math.round(aw * k)), H = Math.max(1, Math.round(ah * k));
  __fxCanvas.width = W; __fxCanvas.height = H; // 大きさを変えると中身も設定も初期化される
  __fxCtx.imageSmoothingEnabled = false;
  __fxCtx.translate(W / 2, H / 2);
  __fxCtx.scale(W / aw, H / ah);
  paint(__fxCtx);

  const mosaic = Math.max(1, Math.min(512, Math.round((Math.abs(Number(e.mosaic) || 0) + 10) / 10)));
  const pix = Math.abs(Number(e.pixelate) || 0) / 10;          // ブロック 1 つの大きさ(スプライトの単位)
  const whirl = -(Number(e.whirl) || 0) * Math.PI / 180;
  const fish = Math.max(0, ((Number(e.fisheye) || 0) + 100) / 100);
  const hue = (Number(e.color) || 0) / 200;                    // 200 でひとまわり
  const bright = Math.min(100, Math.max(-100, Number(e.brightness) || 0)) / 100 * 255;
  const nx = pix > 0 ? Math.max(1, aw / pix) : 0;
  const ny = pix > 0 ? Math.max(1, ah / pix) : 0;
  const geom = mosaic > 1 || pix > 0 || whirl !== 0 || fish !== 1;

  const src = __fxCtx.getImageData(0, 0, W, H).data;
  const out = new ImageData(W, H);
  const od = out.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let u = (x + 0.5) / W, v = (y + 0.5) / H;
      if (geom) {
        if (mosaic > 1) { u = (u * mosaic) % 1; v = (v * mosaic) % 1; }
        if (pix > 0) { u = (Math.floor(u * nx) + 0.5) / nx; v = (Math.floor(v * ny) + 0.5) / ny; }
        if (whirl !== 0) {
          const dx = u - 0.5, dy = v - 0.5;
          const f = Math.max(1 - Math.hypot(dx, dy) / 0.5, 0);
          const a = whirl * f * f, sn = Math.sin(a), cs = Math.cos(a);
          u = cs * dx + sn * dy + 0.5;
          v = -sn * dx + cs * dy + 0.5;
        }
        if (fish !== 1) {
          const vx = (u - 0.5) / 0.5, vy = (v - 0.5) / 0.5;
          const len = Math.hypot(vx, vy);
          if (len > 0) {
            const r = Math.pow(Math.min(len, 1), fish) * Math.max(1, len);
            u = 0.5 + (r * vx / len) * 0.5;
            v = 0.5 + (r * vy / len) * 0.5;
          }
        }
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue; // 範囲の外は透明
      }
      const si = (Math.min(H - 1, Math.floor(v * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      const a = src[si + 3];
      if (a === 0) continue;
      let r = src[si], g = src[si + 1], b = src[si + 2];
      if (hue !== 0) { __shiftHue(r, g, b, hue); r = __rgb[0]; g = __rgb[1]; b = __rgb[2]; }
      const di = (y * W + x) * 4;
      od[di] = r + bright; od[di + 1] = g + bright; od[di + 2] = b + bright; od[di + 3] = a; // 0〜255 に自動で丸められる
    }
  }
  __fxCtx.putImageData(out, 0, 0); // putImageData は変形の影響を受けない
  __rc.drawImage(__fxCanvas, -aw / 2, -ah / 2, aw, ah);
};

`;
