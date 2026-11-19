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
