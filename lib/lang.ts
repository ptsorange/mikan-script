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
__on("mousedown", (e) => { if (e.target === canvas) __mouse.buttons.add(e.button); });
__on("mouseup", (e) => __mouse.buttons.delete(e.button));
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
    draw() {
      if (!this.img) return;
      if(this.r>=360) this.r=0;
      if(this.r<=-1) this.r=359;
      ctx.save();
      const sw = this.w * this.size;
      const sh = this.h * this.size;
      const cx = this.middle ? this.x : this.x + sw / 2;
      const cy = this.middle ? this.y : this.y + sh / 2;
      ctx.translate(cx, cy);
      ctx.rotate(toRadians(this.r));
      if(this.flip) ctx.scale(-1, 1);
      ctx.drawImage(this.img, -(this.w * this.size) / 2, -(this.h * this.size) / 2, this.w * this.size, this.h * this.size);
      ctx.restore();
    },
  });
};

// makeShapeSprite also supports middle=true for center-based coordinates.
const makeShapeSprite = (shape = 4, x = 0, y = 0, w = 50, h = 50, color = "white") =>
  Object.assign(Object.create(__spriteBase), {
    shape, x, y, w, h, r: 0, color, tags: [],
    flip: false,
    size: 1,
    middle: false,
    draw() {
      ctx.save();
      const sw = this.w * this.size;
      const sh = this.h * this.size;
      const cx = this.middle ? this.x : this.x + sw / 2;
      const cy = this.middle ? this.y : this.y + sh / 2;
      ctx.translate(cx, cy);
      ctx.rotate(toRadians(this.r));
      if (this.flip) ctx.scale(-1, 1);
      ctx.fillStyle = this.color;

      ctx.beginPath();
      const rad = Math.min(sw, sh) / 2;

      if (typeof this.shape === "number") {
        for (let i = 0; i < this.shape; i++) {
          const a = (i * 2 * Math.PI) / this.shape - Math.PI / 2;
          const px = rad * Math.cos(a), py = rad * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      } else if (this.shape === "star") {
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? rad : rad / 2;
          const px = r * Math.cos(a), py = r * Math.sin(a);
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
      } else {
        ctx.rect(-sw / 2, -sh / 2, sw, sh);
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  });

// makeTextSprite also supports middle=true; its w/h getters already include size.
const makeTextSprite = (text = "", x = 0, y = 0, fontSize = 24, color = "white") =>
  Object.assign(Object.create(__spriteBase), {
    x, y, fontSize, color, text, r: 0, tags: [],
    flip: false,
    size: 1,
    middle: false,
    __textSprite: true,
    get w() { 
      ctx.font = (this.fontSize * this.size) + "px sans-serif"; 
      return ctx.measureText(String(this.text)).width; 
    },
    get h() { 
      return this.fontSize * this.size; 
    },
    draw() {
      ctx.save();
      const cx = this.middle ? this.x : this.x + this.w / 2;
      const cy = this.middle ? this.y : this.y + this.h / 2;
      ctx.translate(cx, cy);
      ctx.rotate(toRadians(this.r));
      if(this.flip) ctx.scale(-1, 1);
      ctx.font = (this.fontSize * this.size) + "px sans-serif";
      ctx.fillStyle = this.color;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(String(this.text), 0, 0);
      ctx.restore();
    },
  });
// スプライトのグループ(sprite enemys[] で作られる)
const __makeGroup = () => {
  const g = [];
  g.add = (s, ...tags) => { tags.forEach(t => s.addTag(t)); g.push(s); return s; };
  g.remove = (s) => { const i = g.indexOf(s); if (i !== -1) g.splice(i, 1); };
  g.withTag = (t) => g.filter(s => s.hasTag(t));
  g.hit = (target, tag) => g.find(s => (tag === undefined || s.hasTag(tag)) && collide(s, target));
  g.clear = () => { g.length = 0; };
  g.draw = () => g.forEach(s => s.draw());
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
        if (!block && sprites.includes(head[0])) js += "draw();\n";
      } else {
        js += head.join(" ");
        js += block ? ` {\n${compileLines(block, variables)}}\n` : ";\n";
        if (!block && sprites.includes(head[0])) js += "draw();\n";
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
  const drawJs =
    `const draw = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
${sprites.map(s => `  ${s}.draw();`).join("\n")}
};
`;
  const runJs =
    `await Promise.all(__scripts.map(f => f().catch(e => {
  if (e.message !== "stopped") { console.error(e); addLog("エラー: " + e.message + "\\n"); }
})));
`;

  return SPRITE_LIB + spriteJs + drawJs + "draw();\n" + body + runJs;
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