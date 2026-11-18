/* ゲームの中で動く仕組み(1): 実行の管理・待つ・キー入力・ランダム */

export const CORE_RUNTIME = `
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
  __looping = true;
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

`;
