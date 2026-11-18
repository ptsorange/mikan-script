/* ---------- みかんスクリプトのコマンド(英語 ⇔ 日本語) ---------- */

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
  { en: "import", jp: "インポート" },
  { en: "penColor", jp: "ペンの色" },
  { en: "penSize", jp: "ペンの太さ" },
  { en: "penDot", jp: "ペンの点" },
  { en: "penLine", jp: "ペンの線" },
  { en: "penRect", jp: "ペンの四角" },
  { en: "penCircle", jp: "ペンの円" },
  { en: "penClear", jp: "ペンを消す" },
];

export const getCommand = (codeLine: any) => {
  return commands.findIndex(command => command.en === codeLine[0] || command.jp === codeLine[0]);
}
