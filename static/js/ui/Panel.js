import { C } from './Colors.js';

export function makePanel(scene, x, y, w, h, title = null, depth = 0) {
  const cx = x + w/2, cy = y + h/2;
  const g = scene.add.container(cx, cy).setDepth(depth);
  g.add(scene.add.rectangle(4, 5, w, h, 0x000000, 0.42));
  g.add(scene.add.rectangle(0, 0, w+4, h+4, C.PANEL_BORDER));
  g.add(scene.add.rectangle(0, 0, w, h, C.PANEL_BG));
  g.add(scene.add.rectangle(0, -h/2+3, w-4, 4, 0xffffff, 0.07));
  const rim = scene.add.rectangle(0, 0, w-2, h-2);
  rim.setStrokeStyle(1.5, C.GOLD_DARK, 1);
  g.add(rim);
  if (title) {
    g.add(scene.add.rectangle(0, -h/2+16, w, 32, 0x000000, 0.35));
    g.add(scene.add.text(-w/2+12, -h/2+5, title, {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'17px',
      color:C.GOLD_TEXT_S, fontStyle:'bold',
      shadow:{x:1,y:1,color:'#000',blur:0,fill:true},
    }));
    g.add(scene.add.rectangle(0, -h/2+33, w, 1, C.GOLD_DARK, 1));
  }
  return g;
}
