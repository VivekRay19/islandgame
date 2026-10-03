// @ts-check
// Bridge to the Rust/WASM rules engine. The browser's CPU runs the simulation;
// PixiJS (GPU) draws it. The server only verifies finished runs.
import init, * as wasm from '/wasm/island_engine_wasm.js';

let ready = null;
export function loadEngine() {
  ready ??= init().then(() => wasm);
  return ready;
}

const SAVE_KEY = 'ci_run_v2';

export class Run {
  /** @param {any} w wasm module @param {any} cfg @param {{mode:string, seed_code?:string}} meta */
  constructor(w, cfg, meta) {
    this.w = w; this.cfg = cfg; this.meta = meta;
    this.eng = new w.Engine(JSON.stringify(cfg));
    /** @type {any} */ this.v = JSON.parse(this.eng.view());
    this.cmds = [];
  }

  /** Apply one command. Returns {ok, events?|error?}. */
  do(cmd) {
    const r = JSON.parse(this.eng.apply(JSON.stringify(cmd)));
    if (r.ok) { this.cmds.push(cmd); this.v = JSON.parse(this.eng.view()); this.save(); }
    return r;
  }
  buildMap(kind) { return JSON.parse(this.eng.build_map(kind)); }
  preview(kind, q, r) { return JSON.parse(this.eng.preview_build(kind, q, r)); }
  hint() { return JSON.parse(this.eng.hint()); }
  get over() { return this.v.phase === 'over'; }

  save() {
    try {
      if (this.over) { localStorage.removeItem(SAVE_KEY); return; }
      localStorage.setItem(SAVE_KEY, JSON.stringify({ cfg: this.cfg, meta: this.meta, cmds: this.cmds }));
    } catch { /* storage full or private mode: the run still works */ }
  }
  static clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
  static savedInfo() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.cmds ? s : null; } catch { return null; }
  }
  /** Rebuild an in-progress run by deterministic replay. */
  static resume(w, saved) {
    const run = new Run(w, saved.cfg, saved.meta);
    for (const c of saved.cmds) {
      const r = JSON.parse(run.eng.apply(JSON.stringify(c)));
      if (!r.ok) { Run.clearSave(); throw new Error('Saved season no longer matches the rules: ' + r.error); }
      run.cmds.push(c);
    }
    run.v = JSON.parse(run.eng.view());
    return run;
  }
}
