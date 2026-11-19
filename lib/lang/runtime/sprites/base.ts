/* スプライトの仕組み(3): 3 種類のスプライトが共通で使う描画と、スプライトのもと(__spriteBase) */

export const BASE_RUNTIME = `// 3 種類のスプライトが共通で使う描画。位置・回転・反転・効果をここで処理する。
const __renderSprite = (s, sw, sh, rotate, paint) => {
  const c = __rc;
  const cx = s.middle ? s.x : s.x + sw / 2;
  const cy = s.middle ? s.y : s.y + sh / 2;
  c.save();
  c.translate(cx, cy);
  if (rotate) c.rotate(toRadians(s.r));
  if (s.flip) c.scale(-1, 1);
  const e = __maskOnly ? null : s.effects;
  if (e) {
    const ghost = Math.min(100, Math.max(0, Number(e.ghost) || 0));
    if (ghost > 0) c.globalAlpha *= 1 - ghost / 100;
  }
  if (e && __hasPixelFx(e) && Math.abs(sw) >= 1 && Math.abs(sh) >= 1 && isFinite(sw) && isFinite(sh)) {
    __drawFx(e, sw, sh, paint);
  } else {
    paint(c);
  }
  c.restore();
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
  // いまの姿のまま、ペンの絵に押す(スクラッチの「スタンプ」)。スプライト自体は消えない
  stamp() {
    __rc = __penStart();
    try { this.draw(); } finally { __rc = ctx; }
    __penChanged();
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
    if (!k) { addLog(__lang === "en" ? ('Unknown effect "' + name + '".\\n') : ("「" + name + "」という効果はないよ。\\n")); return; }
    this.effects[k] = Number(value) || 0;
  },
  changeEffect(name, delta = 0) {
    const k = __effectName(name);
    if (!k) { addLog(__lang === "en" ? ('Unknown effect "' + name + '".\\n') : ("「" + name + "」という効果はないよ。\\n")); return; }
    this.effects[k] = (Number(this.effects[k]) || 0) + (Number(delta) || 0);
  },
  getEffect(name) {
    const k = __effectName(name);
    return k ? this.effects[k] : 0;
  },
  clearEffects() { this.effects = __newEffects(); },
};
 
`;

// 注意: 下の commonMethods は、どこからも使われていない(もとの lang.ts にあったものをそのまま移した)
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
