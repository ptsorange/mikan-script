/* スプライトの仕組み(1): 層(layer)と描画順 */

export const LAYERS_RUNTIME = `
// ---------- 層(layer)と描画順 ----------
// list の中身(スプライト or グループ)を 1 列にして、[layer, 宣言順] で並べる。
// グループの layer は、中のスプライトの layer に足される。
const __flatten = (list) => {
  const items = [];
  let i = 0;
  for (const e of list) {
    if (Array.isArray(e)) {
      const gl = Number(e.layer) || 0;
      for (const s of e) items.push({ s, l: gl + (Number(s.layer) || 0), i: i++ });
    } else {
      items.push({ s: e, l: Number(e.layer) || 0, i: i++ });
    }
  }
  return items;
};
const __drawAll = (list) => {
  __flatten(list).sort((a, b) => a.l - b.l || a.i - b.i).forEach((o) => o.s.draw());
};
// dir > 0: いちばん手前へ / dir < 0: いちばん奥へ
const __moveLayer = (s, dir) => {
  const items = __flatten(__drawOrder);
  const me = items.find((o) => o.s === s);
  const others = items.filter((o) => o.s !== s).map((o) => o.l);
  if (!others.length) return;
  const base = me ? me.l - (Number(s.layer) || 0) : 0; // グループ分のずれ
  s.layer = (dir > 0 ? Math.max(...others) + 1 : Math.min(...others) - 1) - base;
};

`;
