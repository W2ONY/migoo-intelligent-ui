// 无浏览器跑 Migoo Intelligent UI 的引擎：node harness.js [presetId|all] [--json]
// 用法示例：node harness.js price   /   node harness.js all --json
const fs = require('fs'), vm = require('vm');
const file = process.env.MIUI || require('path').join(__dirname, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const mkEl = () => new Proxy({ style: {}, dataset: {}, value: '', textContent: '', innerHTML: '' }, {
  get(t, k) { if (k in t) return t[k]; if (k === 'classList') return { toggle() {}, add() {}, remove() {}, contains() { return false; } }; if (k === 'closest') return () => null; if (k === 'querySelector') return () => mkEl(); if (k === 'querySelectorAll') return () => []; return (typeof k === 'string') ? () => mkEl() : undefined; },
  set(t, k, v) { t[k] = v; return true; },
});
const document = { querySelector: () => mkEl(), querySelectorAll: () => [], addEventListener() {}, createElement: () => mkEl(), body: { appendChild() {} } };
const ctx = vm.createContext({ console, document, window: {}, location: { hash: '' }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, navigator: {}, setTimeout, clearTimeout, confirm: () => true, encodeURIComponent, JSON, Math, Number, String, Array, Object, Set, Map, Infinity, NaN, isFinite, parseFloat, parseInt, Function, Proxy, Promise, Error, Date });
vm.runInContext(scripts, ctx, { filename: 'index.html' });
const args = process.argv.slice(2); const flags = {}; args.filter(a => a.startsWith('--')).forEach(a => { const [k, v] = a.slice(2).split('='); flags[k] = v == null ? true : v; });
const which = args.find(a => !a.startsWith('--')) || 'all'; const asJson = !!flags.json;
const ids = which === 'all' ? vm.runInContext('PRESETS.map(p=>p.id)', ctx) : [which];
// 覆盖：--q="macbook pro" --surface=feed --u.priceSensitivity=90 --c.hasTask=1 --budget=600
const applyFlags = () => { const js = []; if (flags.q) js.push(`state.query=${JSON.stringify(flags.q)}`); if (flags.surface) js.push(`state.context.surface=${JSON.stringify(flags.surface)}`); if (flags.budget) js.push(`state.user.budgetMax=${flags.budget === 'null' ? 'null' : +flags.budget}`); for (const k in flags) { if (k.startsWith('u.')) js.push(`state.user[${JSON.stringify(k.slice(2))}]=${isNaN(+flags[k]) ? JSON.stringify(flags[k]) : +flags[k]}`); if (k.startsWith('c.')) js.push(`state.context[${JSON.stringify(k.slice(2))}]=${flags[k] === '1' || flags[k] === 'true' ? 'true' : flags[k] === '0' || flags[k] === 'false' ? 'false' : isNaN(+flags[k]) ? JSON.stringify(flags[k]) : +flags[k]}`); } if (js.length) vm.runInContext(js.join(';') + ';renderAll()', ctx); };
const out = {};
for (const id of ids) {
  vm.runInContext(`applyPreset(${JSON.stringify(id)})`, ctx); applyFlags();
  const r = vm.runInContext(`(function(){ const sig=state.sig; return { preset: ${JSON.stringify(id)}, surface: sig.context.surface, query: sig.query, user: sig.user, weights: state.weights, shown: state.shown, items: state.ranked.map(it => ({ id: it.p.id, short: it.p.short, price: it.p.price, score: +it.score.toFixed(3), penalty: it.penalty, bonus: it.bonus, surface: it.surface, fired: it.plan.fired.map(f => f.rule.id + (f.override ? '*' : '')), lost: it.plan.fired.flatMap(f => f.effects.filter(e => !e.applied).map(e => f.rule.id + ':' + e.path + ' ' + e.op)), lint: it.lint.map(l => l.level + ': ' + l.title), spec: it.spec, aiLineText: tpl(it.spec.slots.aiLine.g, it.ctx) + tpl(it.spec.slots.aiLine.c, it.ctx), reasons: it.spec.slots.reasons.show ? reasonItems(it.p, it.spec.slots.reasons.pick, it.ctx, it.spec.slots.reasons.max, usedText(it.p, it.spec.slots, it.ctx)) : [], ctaLabel: it.spec.slots.cta.primary.kind === 'none' ? '' : ctaLabel(it.spec.slots.cta.primary, it.p, it.ctx) })) }; })()`, ctx);
  out[id] = r;
  if (!asJson) {
    console.log(`\n=== preset ${id} · ${r.surface} · q="${r.query.text}" intent=${r.query.intent} cues=[${r.query.cues}] budget=${r.user.budgetMax}`);
    console.log('weights', Object.entries(r.weights).filter(([k, v]) => v > 0.001).map(([k, v]) => k + ':' + v.toFixed(2)).join(' '));
    r.items.forEach((it, i) => {
      const S = it.spec.slots;
      console.log(` ${i + 1}. ${it.short} $${it.price} score=${it.score}${it.penalty ? ' pen=' + it.penalty : ''}${it.bonus ? ' bon=' + it.bonus : ''} [${it.surface}]${i >= r.shown ? ' (hidden)' : ''}`);
      if (i < r.shown) {
        console.log(`    ai="${it.aiLineText}" price=e${S.price.emphasis}${S.price.showWas ? ' was' : ''} save=${S.price.saveTag} cmp=${S.price.compareLine} pill=${S.image.pill} badges=[${S.badges}] rating=${S.rating.show} social=${S.social.show} urg=${S.urgencyLine.show ? '"' + S.urgencyLine.text + '"' : false}`);
        console.log(`    cta=${S.cta.primary.kind}${it.ctaLabel ? ' "' + it.ctaLabel + '"' : ''} sec=${S.cta.secondary.kind} task=${S.taskEntry.show ? '"' + S.taskEntry.label + '"' : false} reasons(${S.reasons.show ? S.reasons.max : 0})=[${it.reasons.join(' | ')}] layout=${it.spec.layout}`);
        console.log(`    fired=[${it.fired}]${it.lost.length ? ' lost=[' + it.lost + ']' : ''}`);
        console.log(`    lint: ${it.lint.join(' ; ')}`);
      }
    });
  }
}
if (asJson) console.log(JSON.stringify(out, null, 1));
