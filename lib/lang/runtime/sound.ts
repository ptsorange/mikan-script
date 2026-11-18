/* ゲームの中で動く仕組み(5): サウンド */

export const SOUND_RUNTIME = `// ---------- サウンド ----------
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
