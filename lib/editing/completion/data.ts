import type { Locale } from "@/lib/i18n";

/* ---------- 入力候補に出す、名前や説明の一覧 ---------- */

export const SNIPPETS: Record<string, string> = {
  if: "if ($0) {\n  \n}",
  else: "else {\n  $0\n}",
  while: "while ($0) {\n  \n}",
  for: "for (i, $0) {\n  \n}",
  foreach: "foreach (e, $0) {\n  \n}",
  function: "function $0() {\n  \n}",
  onStart: "onStart {\n  $0\n}",
  onKeyDown: "onKeyDown(e) {\n  $0\n}",
  onKeyUp: "onKeyUp(e) {\n  $0\n}",
  sleep: "sleep($0)",
  print: "print($0)",
  println: "println($0)",
  clearLog: "clearLog()",
  setScreenSize: "setScreenSize($0)",
  random: "random($0)",
  collide: "collide($0)",
  isKey: 'isKey("$0")',
  getNowKey: "getNowKey()",
  playSound: 'playSound("$0")',
  stopSound: 'stopSound("$0")',
  text: 'text $0 = ""',
  num: "num $0 = 0",
  sprite: "sprite $0 = ",
  await: "await ",
  import: 'import $0 "/code/"',
  penColor: 'penColor("$0")',
  penSize: "penSize($0)",
  penDot: "penDot($0)",
  penLine: "penLine($0)",
  penRect: "penRect($0)",
  penCircle: "penCircle($0)",
  penClear: "penClear()",
};

export const EFFECTS_BY_LOCALE: Record<Locale, { name: string; jp: string; detail: string }[]> = {
  ja: [
    { name: "color", jp: "色", detail: "色相をずらす(200 でひとまわり)" },
    { name: "fisheye", jp: "魚眼レンズ", detail: "中心をふくらませる" },
    { name: "whirl", jp: "渦巻き", detail: "中心をねじる(角度)" },
    { name: "pixelate", jp: "ピクセル化", detail: "粗いブロックにする" },
    { name: "mosaic", jp: "モザイク", detail: "小さな絵をタイルのように並べる" },
    { name: "brightness", jp: "明るさ", detail: "明るく/暗く(-100〜100)" },
    { name: "ghost", jp: "幽霊", detail: "透明にする(0〜100)" },
  ],
  en: [
    { name: "color", jp: "色", detail: "Shift hue (200 for full cycle)" },
    { name: "fisheye", jp: "魚眼レンズ", detail: "Bulge from center" },
    { name: "whirl", jp: "渦巻き", detail: "Twist around center (angle)" },
    { name: "pixelate", jp: "ピクセル化", detail: "Pixelate into coarse blocks" },
    { name: "mosaic", jp: "モザイク", detail: "Tile smaller copies" },
    { name: "brightness", jp: "明るさ", detail: "Brighten / darken (-100 to 100)" },
    { name: "ghost", jp: "幽霊", detail: "Transparency (0 to 100)" },
  ],
};

export const EFFECTS = EFFECTS_BY_LOCALE.ja;
export const EFFECT_CALL = /\.\s*(?:setEffect|changeEffect|getEffect)\s*\(\s*["'`][^"'`]*$/;

export const FUNCS_BY_LOCALE: Record<Locale, { name: string; sig: string; body: string }[]> = {
  ja: [
    { name: "makeSprite", sig: "(画像, x, y, w, h)", body: 'makeSprite("$0", 0, 0, 64, 64)' },
    { name: "makeShapeSprite", sig: "(x, y, w, h, 色)", body: "makeShapeSprite($0)" },
    { name: "makeTextSprite", sig: "(文字, x, y, サイズ, 色)", body: "makeTextSprite($0)" },
    { name: "draw", sig: "()", body: "draw()" },
  ],
  en: [
    { name: "makeSprite", sig: "(image, x, y, w, h)", body: 'makeSprite("$0", 0, 0, 64, 64)' },
    { name: "makeShapeSprite", sig: "(x, y, w, h, color)", body: "makeShapeSprite($0)" },
    { name: "makeTextSprite", sig: "(text, x, y, size, color)", body: "makeTextSprite($0)" },
    { name: "draw", sig: "()", body: "draw()" },
  ],
};

export const SPRITE_MEMBERS_BY_LOCALE: Record<Locale, [string, string][]> = {
  ja: [
    ["x", "左上のx座標"],
    ["y", "左上のy座標"],
    ["w", "はば"],
    ["h", "高さ"],
    ["r", "回転(度)"],
    ["size", "大きさ・文字サイズ"],
    ["color", "色"],
    ["text", "文字"],
    ["tags", "タグの配列"],
    ["middle", "中心を基準にする"],
    ["move(", "向きへ進む"],
    ["lookAt(", "相手の方を向く"],
    ["addTag(", "タグをつける"],
    ["removeTag(", "タグをはずす"],
    ["hasTag(", "タグがあるか"],
    ["isHovering(", "マウスが上にあるか"],
    ["isClicking(", "クリックしているか"],
    ["flip", "スプライトを反転"],
    ["dontFlip", "反転を禁止する"],
    ["changeTexture(", "テクスチャを変更する"],
    ["layer", "層(大きいほど手前)"],
    ["setLayer(", "層を決める"],
    ["toFront(", "いちばん手前に出す"],
    ["toBack(", "いちばん奥に下げる"],
    ["setEffect(", '効果をつける("color" など, 値)'],
    ["changeEffect(", "効果を増減する"],
    ["getEffect(", "効果の値を調べる"],
    ["clearEffects(", "効果をぜんぶ消す"],
  ],
  en: [
    ["x", "Top-left X coordinate"],
    ["y", "Top-left Y coordinate"],
    ["w", "Width"],
    ["h", "Height"],
    ["r", "Rotation (degrees)"],
    ["size", "Scale / text size"],
    ["color", "Color"],
    ["text", "Text content"],
    ["tags", "Array of tags"],
    ["middle", "Center anchor mode"],
    ["move(", "Move in facing direction"],
    ["lookAt(", "Face toward target"],
    ["addTag(", "Add a tag"],
    ["removeTag(", "Remove a tag"],
    ["hasTag(", "Check if tag exists"],
    ["isHovering(", "Is mouse hovering"],
    ["isClicking(", "Is being clicked"],
    ["flip", "Flip sprite horizontally"],
    ["dontFlip", "Disable flipping"],
    ["changeTexture(", "Change texture"],
    ["layer", "Layer (higher = front)"],
    ["setLayer(", "Set layer"],
    ["toFront(", "Bring to front"],
    ["toBack(", "Send to back"],
    ["setEffect(", 'Set effect (e.g. "color", value)'],
    ["changeEffect(", "Change effect by delta"],
    ["getEffect(", "Get effect value"],
    ["clearEffects(", "Clear all effects"],
  ],
};

export const GROUP_MEMBERS_BY_LOCALE: Record<Locale, [string, string][]> = {
  ja: [
    ["add(", "追加する"],
    ["remove(", "取りのぞく"],
    ["withTag(", "タグで絞る"],
    ["hit(", "ぶつかった要素"],
    ["clear(", "ぜんぶ消す"],
    ["draw(", "ぜんぶ描く"],
    ["layer", "グループの層"],
    ["length", "個数"],
    ["push(", "うしろに追加"],
    ["filter(", "絞りこむ"],
  ],
  en: [
    ["add(", "Add sprite"],
    ["remove(", "Remove sprite"],
    ["withTag(", "Filter by tag"],
    ["hit(", "Colliding element"],
    ["clear(", "Clear all"],
    ["draw(", "Draw all"],
    ["layer", "Group layer"],
    ["length", "Item count"],
    ["push(", "Append item"],
    ["filter(", "Filter items"],
  ],
};

export const MOUSE_MEMBERS_BY_LOCALE: Record<Locale, [string, string][]> = {
  ja: [
    ["x", "マウスのx"],
    ["y", "マウスのy"],
    ["left", "左ボタン"],
    ["middle", "まん中ボタン"],
    ["right", "右ボタン"],
  ],
  en: [
    ["x", "Mouse X"],
    ["y", "Mouse Y"],
    ["left", "Left button"],
    ["middle", "Middle button"],
    ["right", "Right button"],
  ],
};

export const FUNCS = FUNCS_BY_LOCALE.ja;
export const SPRITE_MEMBERS = SPRITE_MEMBERS_BY_LOCALE.ja;
export const GROUP_MEMBERS = GROUP_MEMBERS_BY_LOCALE.ja;
export const MOUSE_MEMBERS = MOUSE_MEMBERS_BY_LOCALE.ja;

/* ---------- JavaScript の入力候補 ---------- */

// 予約語(body の $0 にカーソルが来る)
export const JS_KEYWORDS: { name: string; body: string; detail: string }[] = [
  { name: "const", body: "const $0 = ", detail: "const" },
  { name: "let", body: "let $0 = ", detail: "let" },
  { name: "var", body: "var $0 = ", detail: "var" },
  { name: "return", body: "return $0", detail: "return" },
  { name: "break", body: "break", detail: "break" },
  { name: "continue", body: "continue", detail: "continue" },
  { name: "switch", body: "switch ($0) {\n  case :\n    break\n  default:\n    break\n}", detail: "switch" },
  { name: "case", body: "case $0:", detail: "case" },
  { name: "default", body: "default:", detail: "default" },
  { name: "try", body: "try {\n  $0\n} catch (e) {\n  \n}", detail: "try / catch" },
  { name: "catch", body: "catch (e) {\n  $0\n}", detail: "catch" },
  { name: "finally", body: "finally {\n  $0\n}", detail: "finally" },
  { name: "throw", body: "throw new Error($0)", detail: "throw" },
  { name: "new", body: "new $0", detail: "new" },
  { name: "typeof", body: "typeof $0", detail: "typeof" },
  { name: "instanceof", body: "instanceof $0", detail: "instanceof" },
  { name: "class", body: "class $0 {\n  \n}", detail: "class" },
  { name: "async", body: "async ", detail: "async" },
  { name: "true", body: "true", detail: "boolean" },
  { name: "false", body: "false", detail: "boolean" },
  { name: "null", body: "null", detail: "null" },
  { name: "undefined", body: "undefined", detail: "undefined" },
  { name: "this", body: "this", detail: "this" },
];

// 標準の関数・オブジェクト
export const JS_GLOBALS: { name: string; body: string; detail: string; kind: "fn" | "kw" }[] = [
  { name: "Math", body: "Math", detail: "Math", kind: "kw" },
  { name: "JSON", body: "JSON", detail: "JSON", kind: "kw" },
  { name: "Object", body: "Object", detail: "Object", kind: "kw" },
  { name: "Array", body: "Array", detail: "Array", kind: "kw" },
  { name: "Number", body: "Number($0)", detail: "Number()", kind: "fn" },
  { name: "String", body: "String($0)", detail: "String()", kind: "fn" },
  { name: "Boolean", body: "Boolean($0)", detail: "Boolean()", kind: "fn" },
  { name: "Date", body: "Date", detail: "Date", kind: "kw" },
  { name: "Promise", body: "Promise", detail: "Promise", kind: "kw" },
  { name: "Map", body: "new Map($0)", detail: "Map", kind: "fn" },
  { name: "Set", body: "new Set($0)", detail: "Set", kind: "fn" },
  { name: "console", body: "console", detail: "console", kind: "kw" },
  { name: "parseInt", body: "parseInt($0)", detail: "(文字, 進数)", kind: "fn" },
  { name: "parseFloat", body: "parseFloat($0)", detail: "(文字)", kind: "fn" },
  { name: "isNaN", body: "isNaN($0)", detail: "(値)", kind: "fn" },
  { name: "setTimeout", body: "setTimeout($0)", detail: "(関数, ms)", kind: "fn" },
  { name: "setInterval", body: "setInterval($0)", detail: "(関数, ms)", kind: "fn" },
  { name: "clearTimeout", body: "clearTimeout($0)", detail: "(id)", kind: "fn" },
  { name: "clearInterval", body: "clearInterval($0)", detail: "(id)", kind: "fn" },
];

// 「名前.」のあとに出すメンバー([名前, 説明])。"(" で終わるものは呼び出し
const m = (list: string): [string, string][] =>
  list.split(",").map((x) => {
    const [n, d = ""] = x.trim().split("|");
    return [n, d];
  });

export const MATH_MEMBERS: [string, string][] = m(
  "PI|円周率,E|ネイピア数,abs(|絶対値,floor(|切り捨て,ceil(|切り上げ,round(|四捨五入,trunc(|整数部分,sqrt(|平方根,pow(|べき乗,min(|最小,max(|最大," +
    "random(|0以上1未満の乱数,sin(|サイン,cos(|コサイン,tan(|タンジェント,atan2(|角度(y, x),atan(|アークタンジェント,hypot(|距離,sign(|符号,log(|自然対数,exp(|e のべき乗"
);
export const JSON_MEMBERS: [string, string][] = m("stringify(|文字にする,parse(|文字から戻す");
export const OBJECT_MEMBERS: [string, string][] = m("keys(|キーの配列,values(|値の配列,entries(|[キー, 値]の配列,assign(|コピーして合体,freeze(|変更できなくする,fromEntries(|配列から作る");
export const ARRAY_STATIC_MEMBERS: [string, string][] = m("isArray(|配列か調べる,from(|配列にする,of(|値から作る");
export const NUMBER_STATIC_MEMBERS: [string, string][] = m("isInteger(|整数か,isFinite(|有限か,parseFloat(|文字から数,MAX_SAFE_INTEGER|最大の安全な整数,EPSILON|ごく小さな差");
export const DATE_STATIC_MEMBERS: [string, string][] = m("now(|いまの時刻(ミリ秒)");
export const PROMISE_STATIC_MEMBERS: [string, string][] = m("all(|ぜんぶ待つ,resolve(|成功した Promise,reject(|失敗した Promise,race(|いちばん早いもの");
export const CONSOLE_MEMBERS: [string, string][] = m("log(|ログに出す,warn(|警告,error(|エラー,table(|表で出す");

// 配列・文字列でよく使うメソッド(スプライトのグループにも共通のもの)
export const ARRAY_MEMBERS: [string, string][] = m(
  "length|長さ,push(|うしろに追加,pop(|うしろから取り出す,shift(|先頭を取り出す,unshift(|先頭に追加,splice(|取りのぞく・差しこむ,slice(|一部を切り出す," +
    "map(|それぞれ変換,filter(|絞りこむ,find(|最初に見つかる要素,findIndex(|最初の位置,some(|ひとつでも当てはまる,every(|すべて当てはまる,reduce(|ひとつにまとめる," +
    "forEach(|それぞれに実行,includes(|ふくむか,indexOf(|位置を調べる,join(|文字でつなぐ,concat(|つなげる,reverse(|逆にする,sort(|並べかえる,flat(|平らにする,fill(|うめる"
);
export const STRING_MEMBERS: [string, string][] = m(
  "length|長さ,split(|分ける,trim(|前後の空白を消す,replace(|置きかえる,replaceAll(|すべて置きかえる,includes(|ふくむか,startsWith(|はじまりが同じか,endsWith(|おわりが同じか," +
    "indexOf(|位置を調べる,slice(|一部を切り出す,substring(|一部を切り出す,toUpperCase(|大文字にする,toLowerCase(|小文字にする,padStart(|前をうめる,padEnd(|うしろをうめる,repeat(|くり返す,charAt(|n番目の文字"
);
export const NUMBER_MEMBERS: [string, string][] = m("toFixed(|小数点以下の桁数,toString(|文字にする");
