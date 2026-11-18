/* スプライトの仕組み(5): makeShapeSprite(図形のスプライト) */

export const MAKE_SHAPE_SPRITE_RUNTIME = `// makeShapeSprite supports both signatures:
//   makeShapeSprite(x, y, w, h, color)                 // rectangle (legacy/simple form)
//   makeShapeSprite(shape, x, y, w, h, color)           // explicit shape
// The original 5-argument shape-first form (shape, x, y, w, h) is also preserved.
const makeShapeSprite = (...args) => {
  let shape = 4;
  let x = 0;
  let y = 0;
  let w = 50;
  let h = 50;
  let color = "white";

  if (args.length >= 6) {
    // Explicit shape + color.
    shape = args[0];
    x = args[1];
    y = args[2];
    w = args[3];
    h = args[4];
    color = args[5];
  } else if (args.length === 5 && typeof args[4] === "string" && typeof args[0] !== "string") {
    // Simple rectangle form: x, y, width, height, color.
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    color = args[4];
    shape = "rect";
  } else if (args.length >= 5) {
    // Backward-compatible shape-first form without an explicit color.
    shape = args[0];
    x = args[1];
    y = args[2];
    w = args[3];
    h = args[4];
  } else if (args.length === 4) {
    // Rectangle without an explicit color.
    x = args[0];
    y = args[1];
    w = args[2];
    h = args[3];
    shape = "rect";
  } else if (args.length > 0) {
    // Partial shape-first form; omitted values keep their defaults.
    shape = args[0];
    if (args.length > 1) x = args[1];
    if (args.length > 2) y = args[2];
    if (args.length > 3) w = args[3];
  }

  return Object.assign(Object.create(__spriteBase), {
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

        if (shape === "rect" || shape === "rectangle") {
          c.rect(-sw / 2, -sh / 2, sw, sh);
        } else if (typeof shape === "number") {
          const sides = Math.max(3, Math.floor(shape));
          for (let i = 0; i < sides; i++) {
            const a = (i * 2 * Math.PI) / sides - Math.PI / 2;
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
};

`;
