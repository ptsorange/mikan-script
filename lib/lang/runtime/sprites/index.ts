/* スプライトまわりの、ゲームの中で動く仕組み。パートごとのファイルを順につないだものが、
   もとの 1 つの SPRITE_LIB と同じ文字列になる。 */

import { LAYERS_RUNTIME } from "./layers";
import { EFFECTS_RUNTIME } from "./effects";
import { BASE_RUNTIME } from "./base";
import { MAKE_SPRITE_RUNTIME } from "./makeSprite";
import { MAKE_SHAPE_SPRITE_RUNTIME } from "./makeShapeSprite";
import { MAKE_TEXT_SPRITE_RUNTIME } from "./makeTextSprite";
import { GROUP_RUNTIME } from "./group";

export const SPRITE_LIB =
  LAYERS_RUNTIME +
  EFFECTS_RUNTIME +
  BASE_RUNTIME +
  MAKE_SPRITE_RUNTIME +
  MAKE_SHAPE_SPRITE_RUNTIME +
  MAKE_TEXT_SPRITE_RUNTIME +
  GROUP_RUNTIME;
