import * as Blockly from "blockly";
import type { Locale } from "@/lib/i18n";
import { getBasicBlocks } from "./basic";
import { getVariableBlocks } from "./variables";
import { getSpriteBlocks } from "./sprite";
import { getEffectBlocks } from "./effects";
import { getSoundAndLogBlocks } from "./soundAndLog";
import { getInputBlocks } from "./input";
import { getMathAndTextBlocks } from "./mathAndText";

// このアプリ専用のブロック(Blockly 標準のブロックにないもの)
let definedLocale: Locale | null = null;
export const defineMikanBlocks = (locale: Locale = "ja") => {
  if (definedLocale === locale) return;
  definedLocale = locale;
  Blockly.common.defineBlocksWithJsonArray([
    ...getBasicBlocks(locale),
    ...getVariableBlocks(locale),
    ...getSpriteBlocks(locale),
    ...getEffectBlocks(locale),
    ...getSoundAndLogBlocks(locale),
    ...getInputBlocks(locale),
    ...getMathAndTextBlocks(locale),
  ]);
};
