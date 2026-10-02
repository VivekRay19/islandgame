import { auth, api } from '../api.js';

export class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    // All assets are drawn procedurally — nothing to load
    const s = this, w = s.scale.width, h = s.scale.height;
    s.add.rectangle(w/2, h/2, w, h, 0x0e1f09);
    s.add.text(w/2, h/2, 'Starting…', {
      fontFamily: 'system-ui,Arial,sans-serif',
      fontSize: '22px', color: '#ffe46b',
    }).setOrigin(0.5, 0.5);
  }

  create() {
    // Tell the HTML splash screen Phaser is alive
    window.dispatchEvent(new Event('phaser-boot'));

    // Use .then/.catch so Phaser doesn't silently swallow async errors
    this._boot().catch(err => {
      console.error('BootScene error:', err);
      // Still transition even on error
      this.scene.start('MenuScene');
    });
  }

  async _boot() {
    if (auth.isLoggedIn()) {
      try {
        await api.me();           // verify token still valid
        this.scene.start('MenuScene');
        return;
      } catch (_) {
        auth.clearSession();      // stale token — re-login
      }
    }
    this.scene.start('MenuScene');
  }
}
