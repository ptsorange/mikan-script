/* ゲームの中で動く仕組み(JavaScript の文字列)。パートごとのファイルを順につないだものが、
   もとの 1 つの RUNTIME と同じ文字列になる。 */

import { CORE_RUNTIME } from "./core";
import { COLLISION_RUNTIME } from "./collision";
import { PEN_RUNTIME } from "./pen";
import { MOUSE_RUNTIME } from "./mouse";
import { SOUND_RUNTIME } from "./sound";

export const RUNTIME = CORE_RUNTIME + COLLISION_RUNTIME + PEN_RUNTIME + MOUSE_RUNTIME + SOUND_RUNTIME;
