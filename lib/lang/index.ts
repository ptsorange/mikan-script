/* みかんスクリプト(コードを JavaScript にするところ)の入り口。
   使う側は、これまでどおり "@/lib/lang" から読み込める。 */

export { commands, getCommand } from "./commands";
export { getInside } from "./helpers";
export { splitCode } from "./tokenizer";
export { compile } from "./compiler";
export { normalizeModulePath, type ModuleSources } from "./modules";
export { RUNTIME } from "./runtime";
