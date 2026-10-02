export function makeTextInput(scene, x, y, w, placeholder, isPassword=false) {
  const el = document.createElement('input');
  el.type = isPassword ? 'password' : 'text';
  el.placeholder = placeholder;
  el.style.cssText = [
    `width:${w}px`, 'padding:8px 12px',
    'background:#1a0c05', 'color:#fff',
    'border:2px solid #8c591a', 'border-radius:4px',
    'font-size:15px', 'font-family:system-ui,Arial,sans-serif',
    'outline:none', 'box-sizing:border-box',
  ].join(';');
  el.addEventListener('focus', ()=>{ el.style.borderColor='#ffc800'; });
  el.addEventListener('blur',  ()=>{ el.style.borderColor='#8c591a'; });
  const dom = scene.add.dom(x, y, el).setDepth(50);
  dom.getValue = ()=>el.value.trim();
  dom.clear    = ()=>{ el.value=''; };
  dom.focus    = ()=>el.focus();
  return dom;
}
