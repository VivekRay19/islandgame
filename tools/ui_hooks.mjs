// Node ESM loader hooks: map browser-absolute URLs to local files / stubs for the UI smoke test.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const STATIC = path.resolve(process.env.STATIC_DIR || 'static');
export async function resolve(spec, ctx, next) {
  if (spec === '/vendor/pixi.min.mjs') return { url: pathToFileURL(path.resolve(import.meta.dirname, 'pixi_stub.mjs')).href, shortCircuit: true };
  if (spec === '/vendor/anime.esm.min.js') return { url: pathToFileURL(path.resolve(import.meta.dirname, 'anime_stub.mjs')).href, shortCircuit: true };
  if (spec.startsWith('/') && !spec.startsWith(STATIC)) return { url: pathToFileURL(path.join(STATIC, spec)).href, shortCircuit: true };
  return next(spec, ctx);
}
