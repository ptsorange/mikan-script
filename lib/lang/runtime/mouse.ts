/* ゲームの中で動く仕組み(4): onStart の予約(__scripts)とマウス */

export const MOUSE_RUNTIME = `const __scripts = [];
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

`;
