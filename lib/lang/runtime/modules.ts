/* import したコードファイルを、外から使うための仕組み */

// 外から使うとき、ないものを呼んだら、どの名前がないのか教える
export const MODULE_LIB = `
const __moduleProxy = (name, exp) => new Proxy(exp, {
  get(t, k, r) {
    if (typeof k === "string" && !(k in t)) __warn(__lang === "en" ? ('"' + k + '" does not exist in "' + name + '".\\n') : ("「" + name + "」には「" + k + "」がないよ。\\n"));
    return Reflect.get(t, k, r);
  },
});
`;
