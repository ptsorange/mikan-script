import * as Blockly from "blockly";
import { BASIC_BLOCKS } from "./basic";
import { VARIABLE_BLOCKS } from "./variables";
import { SPRITE_BLOCKS } from "./sprite";
import { EFFECT_BLOCKS } from "./effects";
import { SOUND_AND_LOG_BLOCKS } from "./soundAndLog";
import { INPUT_BLOCKS } from "./input";
import { MATH_AND_TEXT_BLOCKS } from "./mathAndText";

// このアプリ専用のブロック(Blockly 標準のブロックにないもの)
let defined = false;
export const defineMikanBlocks = () => {
  if (defined) return;
  defined = true;
  Blockly.common.defineBlocksWithJsonArray([
    ...BASIC_BLOCKS,
    ...VARIABLE_BLOCKS,
    ...SPRITE_BLOCKS,
    ...EFFECT_BLOCKS,
    ...SOUND_AND_LOG_BLOCKS,
    ...INPUT_BLOCKS,
    ...MATH_AND_TEXT_BLOCKS,
  ]);
};
