/* ---------- ブロックの一覧(左のサイドバーに出るもの) ---------- */

// 数・文字を最初から入れておく(空のままだと 0 や "" になってしまうので)
const num = (n: number) => `<shadow type="math_number"><field name="NUM">${n}</field></shadow>`;
const txt = (s: string) => `<shadow type="mk_text"><field name="TEXT">${s}</field></shadow>`;
const bool = `<shadow type="logic_boolean"><field name="BOOL">TRUE</field></shadow>`;

export const TOOLBOX = `
<xml>
  <category name="イベント" colour="45">
    <block type="mk_on_start"></block>
    <block type="mk_on_key"></block>
  </category>

  <category name="動き" colour="210">
    <block type="mk_sprite_create">
      <value name="X">${num(0)}</value>
      <value name="Y">${num(0)}</value>
    </block>
    <block type="mk_sprite_move"><value name="SPEED">${num(5)}</value></block>
    <block type="mk_sprite_position">
      <value name="X">${num(0)}</value>
      <value name="Y">${num(0)}</value>
    </block>
    <block type="mk_sprite_rotate"><value name="ANGLE">${num(0)}</value></block>
    <block type="mk_sprite_size"><value name="SIZE">${num(1)}</value></block>
    <block type="mk_sprite_look_at"></block>
  </category>

  <category name="見た目" colour="270">
    <block type="mk_print"><value name="VALUE">${txt("こんにちは")}</value></block>
    <block type="mk_clear_log"></block>
    <block type="mk_sprite_effect_set"><value name="VALUE">${num(50)}</value></block>
    <block type="mk_sprite_effect_change"><value name="VALUE">${num(10)}</value></block>
    <block type="mk_sprite_effect_clear"></block>
    <block type="mk_sprite_layer"><value name="LAYER">${num(0)}</value></block>
    <block type="mk_sprite_order"></block>
  </category>

  <category name="音" colour="300">
    <block type="mk_play_sound"><value name="VOLUME">${num(1)}</value></block>
    <block type="mk_stop_sound"></block>
  </category>

  <category name="制御" colour="30">
    <block type="controls_if"></block>
    <block type="mk_while"><value name="COND">${bool}</value></block>
    <block type="mk_for"><value name="COUNT">${num(10)}</value></block>
    <block type="mk_foreach"><value name="LIST"><shadow type="lists_create_with"></shadow></value></block>
    <block type="mk_sleep"><value name="MS">${num(1000)}</value></block>
  </category>

  <category name="調べる" colour="180">
    <block type="mk_key_pressed"></block>
    <block type="mk_mouse_value"></block>
    <block type="mk_sprite_hovering"></block>
    <block type="mk_sprite_clicking"></block>
    <block type="mk_sprite_effect_value"></block>
    <block type="mk_collision"></block>
  </category>

  <category name="演算" colour="120">
    <block type="logic_compare"></block>
    <block type="logic_operation"></block>
    <block type="logic_negate"></block>
    <block type="logic_boolean"></block>
    <block type="math_arithmetic"></block>
    <block type="math_modulo"></block>
    <block type="math_trig"></block>
    <block type="math_single"></block>
    <block type="math_number"></block>
    <block type="mk_random"><value name="FROM">${num(1)}</value><value name="TO">${num(10)}</value></block>
    <block type="mk_round"><value name="VALUE">${num(3.14)}</value></block>
    <block type="mk_math_constant"></block>
  </category>

  <category name="変数" colour="30">
    <block type="mk_set_variable"><value name="VALUE">${num(0)}</value></block>
    <block type="mk_change_variable"><value name="VALUE">${num(1)}</value></block>
  </category>

  <category name="リスト" colour="15">
    <block type="lists_create_with"></block>
    <block type="lists_length"></block>
    <block type="lists_isEmpty"></block>
    <block type="lists_getIndex"></block>
    <block type="lists_setIndex"></block>
    <block type="lists_indexOf"></block>
  </category>

  <category name="文字列" colour="160">
    <block type="mk_text"></block>
    <block type="mk_text_join"><value name="A">${txt("Hello ")}</value><value name="B">${txt("World")}</value></block>
    <block type="mk_text_contains"><value name="TEXT">${txt("みかん")}</value><value name="FIND">${txt("か")}</value></block>
    <block type="mk_text_length"><value name="TEXT">${txt("みかん")}</value></block>
    <block type="text_join"></block>
    <block type="text_length"></block>
    <block type="text_isEmpty"></block>
  </category>

  <category name="ステージ" colour="210">
    <block type="mk_screen_size"><value name="W">${num(400)}</value><value name="H">${num(300)}</value></block>
  </category>
</xml>`;
