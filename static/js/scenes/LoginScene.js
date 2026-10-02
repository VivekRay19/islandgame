import { C }             from '../ui/Colors.js';
import { makePanel }     from '../ui/Panel.js';
import { makeButton }    from '../ui/Button.js';
import { makeTextInput } from '../ui/TextInput.js';
import { api, auth }     from '../api.js';

export class LoginScene extends Phaser.Scene {
  constructor() { super({ key:'LoginScene' }); }

  create() {
    const sw=this.scale.width, sh=this.scale.height;
    this.isRegister = false;

    // Background
    this.add.rectangle(sw/2,sh/2,sw,sh,C.BG_DARK);
    this.add.circle(sw/2,sh/2,sh*0.55,0x2a1808,0.12);

    // Panel
    const pw=420, ph=400;
    const px=sw/2-pw/2, py=sh/2-ph/2;
    this._panel = makePanel(this, px, py, pw, ph, '  Login to Your Island');

    // Inputs
    const ix = sw/2, iy_base = sh/2 - 100;
    this._inUser  = makeTextInput(this, ix, iy_base,      pw-40, 'Username');
    this._inPass  = makeTextInput(this, ix, iy_base+60,   pw-40, 'Password', true);
    this._inDisp  = makeTextInput(this, ix, iy_base+120,  pw-40, 'Display Name (optional)');
    this._inDisp.setVisible(false);

    // Buttons
    this._btnMain   = makeButton(this, px+20, iy_base+160, pw-40, 48, 'LOGIN', C.GREEN_BTN, ()=>this._submit());
    this._btnToggle = makeButton(this, px+20, iy_base+218, pw-40, 36, 'No account? Create one', C.BLUE_BTN, ()=>this._toggle());
    makeButton(this, px+20, iy_base+264, 100, 32, 'Back', C.PANEL_MID, ()=>this.scene.start('MenuScene'));

    // Error text
    this._errTxt = this.add.text(sw/2, iy_base+148, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'13px', color:C.RED_S,
      backgroundColor:'#3a0808', padding:{x:8,y:4},
    }).setOrigin(0.5,1).setDepth(20);

    // Loading text
    this._loadTxt = this.add.text(sw/2, iy_base+188, '', {
      fontFamily:'system-ui,Arial,sans-serif', fontSize:'15px', color:C.GOLD_TEXT_S,
    }).setOrigin(0.5,0.5).setDepth(20);
  }

  _toggle() {
    this.isRegister = !this.isRegister;
    const title = this.isRegister ? '  Create Account' : '  Login to Your Island';
    // update panel title text
    this._errTxt.setText('');
    this._inDisp.setVisible(this.isRegister);
    this._btnMain.setLabel(this.isRegister ? 'CREATE ACCOUNT' : 'LOGIN');
    this._btnToggle.setLabel(this.isRegister ? 'Already have an account? Login' : 'No account? Create one');
  }

  async _submit() {
    this._errTxt.setText('');
    const user = this._inUser.getValue();
    const pass = this._inPass.getValue();
    if (user.length < 3) { this._errTxt.setText('Username must be at least 3 characters.'); return; }
    if (pass.length < 4) { this._errTxt.setText('Password must be at least 4 characters.'); return; }

    this._loadTxt.setText('Please wait…');
    try {
      let data;
      if (this.isRegister) {
        const disp = this._inDisp.getValue() || user;
        data = await api.register(user, pass, disp);
      } else {
        data = await api.login(user, pass);
      }
      auth.setSession(data.token, data.player);
      this._loadTxt.setText('');
      this.scene.start('LobbyScene');
    } catch(e) {
      this._loadTxt.setText('');
      this._errTxt.setText(e.message || 'Login failed');
    }
  }
}
