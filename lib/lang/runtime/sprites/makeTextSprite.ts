/* スプライトの仕組み(6): makeTextSprite(文字のスプライト) */

export const MAKE_TEXT_SPRITE_RUNTIME = `// makeTextSprite also supports middle=true; its w/h getters already include size.
const oldMakeTextSprite = (text = "", x = 0, y = 0, fontSize = 24, color = "white") =>
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
      const middle = this.middle;
      
      // 第3引数に middle を指定し、基準点を切り替える
      __renderSprite(this, sw, sh, middle, (c) => {
        c.font = font;
        c.fillStyle = color;
        if (middle) {
          c.textBaseline = "middle";
          c.textAlign = "center";
          c.fillText(str, 0, 0);
        } else {
          c.textBaseline = "top";
          c.textAlign = "left";
          c.fillText(str, 0, 0);
        }
      });
    },
  });
`;
