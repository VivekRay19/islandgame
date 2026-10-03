export function animate(target, params) { try { params?.onComplete?.(); } catch {} return { pause() {}, cancel() {} }; }
