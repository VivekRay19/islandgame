import { C } from './Colors.js';

export function makeButton(scene, x, y, w, h, label, bgColor, onClick, enabled=true, depth=0) {
  const cx = x+w/2, cy = y+h/2;
  const g  = scene.add.container(cx, cy).setDepth(depth);
  const col = enabled ? bgColor : C.DISABLED;
  g.add(scene.add.rectangle(3, 4, w, h, 0x000000, 0.46));
  g.add(scene.add.rectangle(0, 0, w+2, h+2, C.GOLD_DARK));
  const body = scene.add.rectangle(0, 0, w, h, col);
  g.add(body);
  g.add(scene.add.rectangle(0, -h/4, w-2, h/2, 0xffffff, 0.14));
  g.add(scene.add.rectangle(0, h*0.32, w-2, h*0.18, 0x000000, 0.18));
  const txt = scene.add.text(0, 1, label, {
    fontFamily:'system-ui,Arial,sans-serif',
    fontSize:`${Math.min(h*0.42,20)}px`,
    color:C.WHITE, fontStyle:'bold',
    shadow:{x:1,y:1,color:'#000',blur:0,fill:true},
  }).setOrigin(0.5,0.5);
  g.add(txt);
  if (enabled) {
    body.setInteractive({useHandCursor:true});
    body.on('pointerover', ()=>body.setAlpha(0.82));
    body.on('pointerout',  ()=>body.setAlpha(1));
    body.on('pointerdown', ()=>{ g.y+=2; scene.time.delayedCall(80,()=>{g.y=cy;}); });
    body.on('pointerup',   onClick);
  }
  g._label = txt;
  g.setLabel = (s) => txt.setText(s);
  return g;
}
