export const commands = [
  { en: "print", jp: "表示" },
  { en: "println", jp: "改行で表示" },
  { en: "text", jp: "テキスト" },
  { en: "num", jp: "数" },
  { en: "sprite", jp: "スプライト" },
  { en: "if", jp: "もし" },
  { en: "else", jp: "そうでなければ" },
  { en: "while", jp: "ずっと" },
  { en: "for", jp: "繰り返す" },
  { en: "times", jp: "回" },
  { en: "sleep", jp: "待つ" },
  { en: "onStart", jp: "スタートしたら" },
  { en: "onKeyDown", jp: "キーを押したら" },
  { en: "onKeyUp", jp: "キーを離したら" },
  { en: "clearLog", jp: "ログをクリア" },
  { en: "setScreenSize", jp: "スクリーンサイズ" },
  { en: "random", jp: "ランダム" },
  { en: "collide", jp: "当たり判定" },
  { en: "function", jp: "関数" },
  { en: "PI", jp: "円周率" },
  { en: "foreach", jp: "それぞれ" },
  { en: "getNowKey", jp: "押しているキー" },
  { en: "isKey", jp: "キーが押されている" },
  { en: "mouse", jp: "マウス" },
  { en: "playSound", jp: "音を鳴らす" },
  { en: "stopSound", jp: "音を止める" },
  { en: "await", jp: "終わるまで待つ" },
];

export const RUNTIME = `
(window.__cleanups ?? []).forEach(f => f()); 
window.__cleanups = [];
const __id = (window.__runId = (window.__runId ?? 0) + 1);
const __check = () => { if (window.__runId !== __id) throw new Error("stopped"); };
let __last = performance.now();


const sleep = async (ms) => {
  await new Promise((r) => setTimeout(r, ms));
  __check();                    
  __last = performance.now();
};
const __tick = async () => {
  __check();
  if (performance.now() - __last > 12) {
    await new Promise((r) => setTimeout(r, 0));
    __check();
    __last = performance.now();
  }
};

const __drawPerFrame = async () => {
  while (true) {
    __check();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    __check();
    draw();
  }
};
const __on = (type, fn) => {
  document.addEventListener(type, fn);
  window.__cleanups.push(() => document.removeEventListener(type, fn));
};

const __keys = new Set();
const __keyName = (k) => (k.length === 1 ? k.toLowerCase() : k);
__on("keydown", (e) => __keys.add(__keyName(e.key)));
__on("keyup", (e) => __keys.delete(__keyName(e.key)));
// ウィンドウを離れたときに押しっぱなし扱いにならないようにする
const __onBlur = () => __keys.clear();
window.addEventListener("blur", __onBlur);
window.__cleanups.push(() => window.removeEventListener("blur", __onBlur));

const getNowKey = () => [...__keys];
const isKey = (k) => __keys.has(__keyName(k));

const random = (a, b) => {
  if (a === undefined) return Math.random();        
  if (b === undefined) { b = a; a = 0; }             
  return Math.floor(Math.random() * (b - a + 1)) + a; 
};

const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
}

// スプライトの表示サイズと、middle に応じた当たり判定用の矩形を返す
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
const collide = (a, b) => {
  const A = __spriteBounds(a);
  const B = __spriteBounds(b);
  return A.x < B.x + B.w &&
    A.x + A.w > B.x &&
    A.y < B.y + B.h &&
    A.y + A.h > B.y;
};

const __scripts = [];
const __mouse = { x: 0, y: 0, buttons: new Set() };
const __BTN = { left: 0, middle: 1, right: 2 };

// キャンバス上の座標に変換する(CSSで拡大縮小されていてもずれない)
__on("mousemove", (e) => {
  const r = canvas.getBoundingClientRect();
  __mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  __mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
});
// キャンバスの上で押したときだけ「押している」扱いにする
__on("pointerup", (e) => { if (e.target === canvas) __mouse.buttons.add(e.button); });
__on("pointerdown", (e) => __mouse.buttons.delete(e.button));
// 右クリックでメニューが出ないようにする(キャンバス上だけ)
__on("contextmenu", (e) => { if (e.target === canvas) e.preventDefault(); });
const __onBlurMouse = () => __mouse.buttons.clear();
window.addEventListener("blur", __onBlurMouse);
window.__cleanups.push(() => window.removeEventListener("blur", __onBlurMouse));

const mouse = {
  get x() { return __mouse.x; },
  get y() { return __mouse.y; },
  get left() { return __mouse.buttons.has(0); },
  get middle() { return __mouse.buttons.has(1); },
  get right() { return __mouse.buttons.has(2); },
};
const __inside = (s, px, py) => {
  const b = __spriteBounds(s);
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
};

// ---------- サウンド ----------
// 鳴っている音の一覧
const __sounds = new Set();
let __currentVolume = 1; // 現在の音量（0〜1）

// 音量を一括変更する関数（関数宣言にすることで初期化前エラーを防ぐ）
function setGlobalVolume(v) {
  __currentVolume = Math.min(1, Math.max(0, Number(v)));
  [...__sounds].forEach((s) => {
    if (s.audio) {
      s.audio.volume = Math.min(1, Math.max(0, s.baseVolume * __currentVolume));
    }
  });
}

// 「止める」を押したとき
window.__cleanups.push(() => [...__sounds].forEach((s) => s.end(true)));

const playSound = (name, volume = 1, loop = false) => {
  const p = new Promise((resolve, reject) => {
    const url = __getSound(name);
    if (!url) return resolve();
    const audio = new Audio(url);
    const baseVolume = Number(volume);
    const v = Number.isFinite(baseVolume) ? Math.min(1, Math.max(0, baseVolume)) : 1;
    
    // 初期音量を設定
    audio.volume = Math.min(1, Math.max(0, v * __currentVolume));
    audio.loop = !!loop;
    
    const s = {
      name,
      audio,
      baseVolume: v,
      end(stopped) {
        if (!__sounds.delete(s)) return;
        audio.pause();
        if (stopped) reject(new Error("stopped"));
        else resolve();
      },
    };
    __sounds.add(s);
    audio.addEventListener("ended", () => s.end(false));
    const fail = () => {
      if (!__sounds.has(s)) return;
      addLog("「" + name + "」を鳴らせなかったよ。\\n");
      s.end(false);
    };
    audio.addEventListener("error", fail);
    audio.play().catch(fail);
  });
  p.catch(() => {});
  return p;
};

const stopSound = (name) => {
  [...__sounds].forEach((s) => {
    if (name === undefined || s.name === name) s.end(false);
  });
};
`;

const commonMethods = `
  move(speed) {
    this.x += Math.cos(toRadians(this.r)) * speed;
    this.y += Math.sin(toRadians(this.r)) * speed;
  },
  lookAt(target) {
    const cx1 = this.x + this.w / 2;
    const cy1 = this.y + this.h / 2;
    const cx2 = target.x + target.w / 2;
    const cy2 = target.y + target.h / 2;
    this.r = Math.atan2(cy2 - cy1, cx2 - cx1) * (180 / Math.PI);
  }`;

const SPRITE_LIB = `
// ---------- 層(layer)と描画順 ----------
// list の中身(スプライト or グループ)を 1 列にして、[layer, 宣言順] で並べる。
// グループの layer は、中のスプライトの layer に足される。
const __flatten = (list) => {
  const items = [];
  let i = 0;
  for (const e of list) {
    if (Array.isArray(e)) {
      const gl = Number(e.layer) || 0;
      for (const s of e) items.push({ s, l: gl + (Number(s.layer) || 0), i: i++ });
    } else {
      items.push({ s: e, l: Number(e.layer) || 0, i: i++ });
    }
  }
  return items;
};
const __drawAll = (list) => {
  __flatten(list).sort((a, b) => a.l - b.l || a.i - b.i).forEach((o) => o.s.draw());
};
// dir > 0: いちばん手前へ / dir < 0: いちばん奥へ
const __moveLayer = (s, dir) => {
  const items = __flatten(__drawOrder);
  const me = items.find((o) => o.s === s);
  const others = items.filter((o) => o.s !== s).map((o) => o.l);
  if (!others.length) return;
  const base = me ? me.l - (Number(s.layer) || 0) : 0; // グループ分のずれ
  s.layer = (dir > 0 ? Math.max(...others) + 1 : Math.min(...others) - 1) - base;
};

// ---------- 効果(スクラッチと同じ 7 つ。0 のときは何もしない) ----------
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
  ctx.drawImage(__fxCanvas, -aw / 2, -ah / 2, aw, ah);
};

// 3 種類のスプライトが共通で使う描画。位置・回転・反転・効果をここで処理する。
const __renderSprite = (s, sw, sh, rotate, paint) => {
  const cx = s.middle ? s.x : s.x + sw / 2;
  const cy = s.middle ? s.y : s.y + sh / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(toRadians(s.r));
  if (s.flip) ctx.scale(-1, 1);
  const e = s.effects;
  if (e) {
    const ghost = Math.min(100, Math.max(0, Number(e.ghost) || 0));
    if (ghost > 0) ctx.globalAlpha *= 1 - ghost / 100;
  }
  if (e && __hasPixelFx(e) && Math.abs(sw) >= 1 && Math.abs(sh) >= 1 && isFinite(sw) && isFinite(sh)) {
    __drawFx(e, sw, sh, paint);
  } else {
    paint(ctx);
  }
  ctx.restore();
};
const __spriteBase = {
  move(speed) {
    this.x += Math.cos(toRadians(this.r)) * speed;
    this.y += Math.sin(toRadians(this.r)) * speed;
  },
  lookAt(target) {
    const c1 = __spriteCenter(this);
    const c2 = __spriteCenter(target);
    this.r = Math.atan2(c2.y - c1.y, c2.x - c1.x) * (180 / Math.PI);
  },
  hasTag(t) { return this.tags.includes(t); },
  addTag(t) { if (!this.tags.includes(t)) this.tags.push(t); },
  removeTag(t) { this.tags = this.tags.filter(x => x !== t); },
  isHovering() { return __inside(this, __mouse.x, __mouse.y); },
  isClicking(button = "left") {
    return __mouse.buttons.has(__BTN[button] ?? 0) && this.isHovering();
  },
  // ---------- 層(layer) ----------
  // layer が小さいほど奥、大きいほど手前。同じ layer なら宣言順(あとのほうが手前)
  setLayer(n) { this.layer = Number(n) || 0; },
  toFront() { __moveLayer(this, 1); },
  toBack() { __moveLayer(this, -1); },
  // ---------- 効果(スクラッチの「〜の効果」) ----------
  setEffect(name, value = 0) {
    const k = __effectName(name);
    if (!k) { addLog("「" + name + "」という効果はないよ。\\n"); return; }
    this.effects[k] = Number(value) || 0;
  },
  changeEffect(name, delta = 0) {
    const k = __effectName(name);
    if (!k) { addLog("「" + name + "」という効果はないよ。\\n"); return; }
    this.effects[k] = (Number(this.effects[k]) || 0) + (Number(delta) || 0);
  },
  getEffect(name) {
    const k = __effectName(name);
    return k ? this.effects[k] : 0;
  },
  clearEffects() { this.effects = __newEffects(); },
};
 
// middle=false: x/y are the top-left. middle=true: x/y are the center.
const makeSprite = (src, x = 0, y = 0, w, h) => {
  const img = __getTexture(src ?? "");
  return Object.assign(Object.create(__spriteBase), {
    x, y, r: 0, tags: [], img,
    w: w ?? (img?.naturalWidth ?? 50),
    h: h ?? (img?.naturalHeight ?? 50),
    flip: false,
    size: 1,
    middle: false,
    dontFlip:false,
    layer: 0,
    effects: __newEffects(),
    draw() {
      if (!this.img) return;
      const img = this.img;
      const sw = this.w * this.size;
      const sh = this.h * this.size;
      __renderSprite(this, sw, sh, !this.dontFlip, (c) => c.drawImage(img, -sw / 2, -sh / 2, sw, sh));
    },
    changeTexture(src){
      this.img = __getTexture(src ?? "");
      this.w=w ?? (img?.naturalWidth ?? 50);
      this.h=h ?? (img?.naturalHeight ?? 50);
    }
  });
};

// makeShapeSprite also supports middle=true for center-based coordinates.
const makeShapeSprite = (shape = 4, x = 0, y = 0, w = 50, h = 50, color = "white") =>
  Object.assign(Object.create(__spriteBase), {
    shape, x, y, w, h, r: 0, color, tags: [],
    flip: false,
    size: 1,
    middle: false,
    layer: 0,
    effects: __newEffects(),
    draw() {
      const sw = this.w * this.size;
      const sh = this.h * this.size;
      const color = this.color;
      const shape = this.shape;
      __renderSprite(this, sw, sh, true, (c) => {
        c.fillStyle = color;
        c.beginPath();
        const rad = Math.min(sw, sh) / 2;

        if (typeof shape === "number") {
          for (let i = 0; i < shape; i++) {
            const a = (i * 2 * Math.PI) / shape - Math.PI / 2;
            const px = rad * Math.cos(a), py = rad * Math.sin(a);
            i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
          }
        } else if (shape === "star") {
          for (let i = 0; i < 10; i++) {
            const a = (i * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? rad : rad / 2;
            const px = r * Math.cos(a), py = r * Math.sin(a);
            i === 0 ? c.moveTo(px, py) : c.lineTo(px, py);
          }
        } else {
          c.rect(-sw / 2, -sh / 2, sw, sh);
        }

        c.closePath();
        c.fill();
      });
    },
  });

// makeTextSprite also supports middle=true; its w/h getters already include size.
const makeTextSprite = (text = "", x = 0, y = 0, fontSize = 24, color = "white") =>
  Object.assign(Object.create(__spriteBase), {
    x, y, fontSize, color, text, r: 0, tags: [],
    flip: false,
    size: 1,
    middle: false,
    layer: 0,
    effects: __newEffects(),
    __textSprite: true,
    get w() { 
      ctx.font = (this.fontSize * this.size) + "px sans-serif"; 
      return ctx.measureText(String(this.text)).width; 
    },
    get h() { 
      return this.fontSize * this.size; 
    },
    draw() {
      const sw = this.w;
      const sh = this.h;
      const font = (this.fontSize * this.size) + "px sans-serif";
      const color = this.color;
      const str = String(this.text);
      __renderSprite(this, sw, sh, true, (c) => {
        c.font = font;
        c.fillStyle = color;
        c.textBaseline = "middle";
        c.textAlign = "center";
        c.fillText(str, 0, 0);
      });
    },
  });
// スプライトのグループ(sprite enemys[] で作られる)
const __makeGroup = () => {
  const g = [];
  g.layer = 0; // グループぜんたいの層。中のスプライトの layer に足される
  g.add = (s, ...tags) => { tags.forEach(t => s.addTag(t)); g.push(s); return s; };
  g.remove = (s) => { const i = g.indexOf(s); if (i !== -1) g.splice(i, 1); };
  g.withTag = (t) => g.filter(s => s.hasTag(t));
  g.hit = (target, tag) => g.find(s => (tag === undefined || s.hasTag(tag)) && collide(s, target));
  g.clear = () => { g.length = 0; };
  g.draw = () => __drawAll([g]);
  return g;
};
`;


const callArgs = (tokens: string[], open: number): string[] => {
  const args: string[] = [];
  let depth = 0, cur: string[] = [];
  for (let i = open; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "(" || t === "[") { depth++; if (i === open) continue; }
    else if (t === ")" || t === "]") { depth--; if (depth === 0) break; }
    else if (t === "," && depth === 1) { args.push(cur.join(" ")); cur = []; continue; }
    cur.push(t);
  }
  if (cur.length) args.push(cur.join(" "));
  return args;
};

export const getCommand = (codeLine: any) => {
  return commands.findIndex(command => command.en === codeLine[0] || command.jp === codeLine[0]);
}

const between = (tokens: string[], from: string, to: string) => {
  const i = tokens.indexOf(from);
  const j = tokens.lastIndexOf(to);
  if (i === -1 || j === -1 || j <= i) return [];
  return tokens.slice(i + 1, j);
};

export const getInside = (firstChar: string, lastChar: string, text: string) => {
  let inside = "";
  let i = text.indexOf(firstChar);
  let j = 1;

  while (i < text.length - 1 && j > 0) {
    i++;
    if (text[i] === firstChar) j++;
    if (text[i] === lastChar) j--;
    if (j > 0) {
      inside += text[i];
    }
  }
  return inside;
}

type Token = string | Token[];

const TOKEN_RE = new RegExp(
  [
    String.raw`\/\/[^\n]*`,
    String.raw`"(?:\\.|[^"\\\n])*"?`,
    String.raw`'(?:\\.|[^'\\\n])*'?`,
    String.raw`\`(?:\\.|[^\`\\])*\`?`,
    String.raw`\n|;`,
    String.raw`[ \t\r]+`,
    String.raw`\d+(?:\.\d+)?`,
    String.raw`===|!==|==|!=|<=|>=|&&|\|\||\+\+|--|\+=|-=|\*=|\/=|=>`,
    String.raw`[.,:?!%()=<>+\-*\/|&\[\]{}]`,
    String.raw`[^\s.,:?!%()=<>+\-*\/|&\[\]{}"'\`;]+`,
  ].join("|"),
  "g"
);

const CONTROL = ["if", "else", "while", "for"];

// JavaScriptに変換する
export const compile = (lines: Token[][], variables: string[]): string => {
  const sprites: string[] = [];
  let spriteJs = "";
  const asyncScripts = [];

  const compileLines = (lines: Token[][], variables: string[]): string => {
    let js = "";
    for (const line of lines) {
      const last = line[line.length - 1];
      const block = Array.isArray(last) ? (last as Token[][]) : null;
      const head = (block ? line.slice(0, -1) : line) as string[];

      // if (head[0] === "num" || head[0] === "text") {
      //   variables.push(head[1]);
      //   js += `let ${head[1]} ${head.slice(2).join(" ")};\n`;
      // }
      // if (head[0] === "print") {
      //   js += `addLog(${head.slice(2, -1).join(" ")});\n`;
      // } 

      // スプライト
      if (head[0] === "sprite") {
        sprites.push(head[1]);
        variables.push(head[1]);

        if (head[2] === "[") {
          // sprite enemys[]
          spriteJs += `const ${head[1]} = __makeGroup();\n`;
        } else if (head[2] === "=" && head[3] === "[" && head[4] === "]") {
          // sprite enemys = []
          spriteJs += `const ${head[1]} = __makeGroup();\n`;
        } else if (["makeSprite", "makeShapeSprite", "makeTextSprite"].includes(head[3])) {
          const args = callArgs(head, 4);
          spriteJs += `const ${head[1]} = ${head[3]}(${args.join(", ")});\n`;
        }
      } else if (head[0] === "foreach") {
        const comma = head.indexOf(",");
        const name = head[comma - 1];
        const list = head.slice(comma + 1, -1).join(" ");
        // [...] でコピーを回すので、ループ中の remove も安全
        js += `for (const ${name} of [...(${list})]) {\nawait __tick();\n${compileLines(block ?? [], [...variables, name])}}\n`;
      } else if (head[0] === "for") {
        const decl = between(head, "(", ",");
        const name = decl[decl.length - 1];
        const count = between(head, ",", ")").join(" ");
        js += `for (let ${name} = 0, __n = (${count}); ${name} < __n; ${name}++)`;
        js += ` {\n${compileLines(block ?? [], [...variables, name])}}\n`;

        //何ms待つsleep
      } else if (head[0] === "sleep") {
        js += `await sleep(${head.slice(2, -1).join(" ")});\n`;

        // 非同期でコードを実行するonStart
      } else if (head[0] === "onStart") {
        js += `__scripts.push(async () => {\n${compileLines(block ?? [], variables)}});\n`;

        // キーが押されたか離されたかを検知
      } else if (head[0] === "onKeyDown" || head[0] === "onKeyUp") {
        const args = between(head, "(", ")");
        const arg = args[args.length - 1] ?? "key";
        const type = head[0] === "onKeyDown" ? "keydown" : "keyup";
        js += `__on("${type}", async (${arg}) => {\n${compileLines(block ?? [], variables)}});\n`;

        // CONTROLの中身OR変数なら
      } else if (CONTROL.includes(head[0]) || variables.includes(head[0])) {
        js += head.join(" ");
        const tick = (head[0] === "while" || head[0] === "for") ? "await __tick();\n" : "";
        js += block
          ? ` {\n${tick}${compileLines(block, variables)}}\n`
          : ";\n";
        // ${(head[0] == "while" && block?.findIndex((b:any)=>b.startsWith("sleep"))) ? "await sleep(0);\n" : ""}
        if (!block && sprites.includes(head[0])) js;
      } else {
        js += head.join(" ");
        js += block ? ` {\n${compileLines(block, variables)}}\n` : ";\n";
        if (!block && sprites.includes(head[0])) js;
      }
    }
    const runJs = `
await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;
    return js;
  };

  const body = compileLines(lines, variables);
  // 描画は layer の小さい順(奥→手前)。同じ layer なら宣言順。
  const drawJs =
    `const __drawOrder = [${sprites.join(", ")}];
const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  __drawAll(__drawOrder);
};
`;
  const runJs =
    `await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;

  const drawLoop = sprites.length > 0
    ? "__drawPerFrame().catch(e => { if (e?.message !== 'stopped') console.error(e); });\n"
    : "";

  return SPRITE_LIB + spriteJs + drawJs + drawLoop + body + runJs;
};

const ALIASES: Record<string, string> = {
  text: "let",
  num: "let",
  print: "addLog",
  println: "addLogLn",
  PI: "Math.PI",
  function: "async function",
};

// コードをトークンずつに分ける
export const splitCode = (code: string): Token[][] => {
  const root: Token[][] = [];
  const stack: Token[][][] = [root];
  const current = () => stack[stack.length - 1];
  let line: Token[] | null = null;
  let prev = false;
  let parenDepth = 0; // () のネストの深さ

  for (let [t] of code.matchAll(TOKEN_RE)) {
    if (t === "\n" || t === ";") {
      // () の中なら改行・セミコロンでは行を区切らない
      // (for(;;) のセミコロンも壊れなくなります)
      if (parenDepth === 0) line = null;
      continue;
    }
    if (/^[ \t\r]+$/.test(t) || t.startsWith("//")) continue;

    const commandIndex = commands.findIndex(command => command.jp === t);
    if (commandIndex !== -1) t = commands[commandIndex].en;

    if (prev != true && ALIASES[t]) {
      t = ALIASES[t];
    }

    if (t == ".") prev = true;
    else prev = false;

    // 括弧の深さを更新(文字列トークンは "(" と一致しないので影響なし)
    if (t === "(") parenDepth++;
    else if (t === ")" && parenDepth > 0) parenDepth--;

    if (t === "{") {
      const block: Token[][] = [];
      if (line) {
        line.push(block);
      } else {
        const last = current()[current().length - 1];
        if (last) last.push(block);
        else current().push([block]);
      }
      stack.push(block);
      line = null;
    } else if (t === "}") {
      if (stack.length > 1) stack.pop();
      line = null;
    } else {
      if (!line) {
        line = [];
        current().push(line);
      }
      line.push(t);
    }
  }

  return root;
};