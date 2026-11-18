/* スプライトの仕組み(4): makeSprite(画像のスプライト) */

export const MAKE_SPRITE_RUNTIME = `// middle=false: x/y are the top-left. middle=true: x/y are the center.
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

`;
