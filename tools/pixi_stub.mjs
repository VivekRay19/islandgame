// Universal chainable stub standing in for PixiJS (no GPU in CI).
const make = () => new Proxy(function () {}, {
  get(t, k) {
    if (k === 'removeChildren') return () => [];
    if (k === 'clone') return () => make();
    if (k === 'destroyed') return false;
    if (k === Symbol.toPrimitive) return () => 0;
    if (k === 'then') return undefined;
    if (k === 'texture') return { width: 1000, height: 1000 };
    if (k === 'lastTime') return 0;
    return t[k] ?? (t[k] = typeof k === 'string' && /^(x|y|alpha|width|height)$/.test(k) ? 0 : make());
  },
  set(t, k, v) { t[k] = v; return true; },
  apply() { return make(); },
  construct() { return make(); },
});
export const Application = class { constructor() { return Object.assign(make(), { init: async () => {}, canvas: document.createElement('canvas'), screen: {}, ticker: { add() {} }, stage: make() }); } };
export const Assets = { load: async () => ({ width: 1000, height: 1000 }) };
export const Container = class { constructor() { return make(); } };
export const Graphics = Container, Sprite = Container, Text = Container, TextStyle = Container;
