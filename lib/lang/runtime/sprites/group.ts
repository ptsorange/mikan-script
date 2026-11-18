/* スプライトの仕組み(7): グループ(sprite enemys[]) */

export const GROUP_RUNTIME = `// スプライトのグループ(sprite enemys[] で作られる)
const __makeGroup = () => {
  const g = [];
  g.layer = 0; // グループぜんたいの層。中のスプライトの layer に足される
  g.add = (s, ...tags) => { tags.forEach(t => s.addTag(t)); g.push(s); return s; };
  g.remove = (s) => { const i = g.indexOf(s); if (i !== -1) g.splice(i, 1); };
  g.withTag = (t) => g.filter(s => s.hasTag(t));
  g.hit = (target, tag, type) => g.find(s => (tag === undefined || s.hasTag(tag)) && collide(s, target, type));
  g.clear = () => { g.length = 0; };
  g.draw = () => __drawAll([g]);
  return g;
};
`;
