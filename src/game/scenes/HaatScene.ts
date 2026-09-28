import Phaser from 'phaser';
import { StateManager } from '../systems/StateManager';
import { HUD } from '../ui/HUD';
import { RESOURCES, ResourceId } from '../data/resources';
import { DevelopmentTask } from '../data/tasks';

export class HaatScene extends Phaser.Scene {
  private state!: StateManager;
  private hud!: HUD;
  private feedbackText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'HaatScene' });
  }

  create(): void {
    this.state = StateManager.getInstance();
    const { width, height } = this.cameras.main;

    // Soft pastel pink backdrop
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xF2B5CE, 0xF2B5CE, 0xE5A0BC, 0xE5A0BC, 1);
    bg.fillRect(0, 0, width, height);

    // Header Pill
    const headerPill = this.add.rectangle(width / 2, 80, 560, 36, 0xFFFFFF, 0.9)
      .setStrokeStyle(1.5, 0xE5A0BC);
    this.add.text(width / 2, 80, '🏪 CENTRAL CULTURAL HAAT • INTER-ISLAND COMMERCE', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#332924',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    // Minimal HUD
    this.hud = new HUD(this);

    // Feedback status banner
    this.feedbackText = this.add.text(width / 2, 115, `Trades remaining this round: ${this.state.tradeSystem.getRemainingTrades()} / 2`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Left Column: Traders Stall
    this.renderTraderStalls(width);

    // Right Column: Development Tasks Board
    this.renderTaskBoard(width);

    // Bottom Return Button
    const returnBtn = this.add.rectangle(width / 2, height - 36, 220, 38, 0xB86D4F)
      .setStrokeStyle(1.5, 0xFFFFFF)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2, height - 36, '← RETURN TO ISLAND', {
      fontFamily: 'Cinzel, Georgia, serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    returnBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      this.scene.start('IslandScene');
    });
  }

  private renderTraderStalls(width: number): void {
    const traders = this.state.tradeSystem.getTraders();
    const startX = width / 4 - 15;
    const startY = 150;

    this.add.text(startX, startY - 12, '🤝 VISITING ISLAND TRADERS', {
      fontFamily: 'Cinzel, Georgia',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    traders.forEach((trader, idx) => {
      const y = startY + 18 + idx * 76;
      const offeredDef = RESOURCES[trader.offeredResource];
      const requestedDef = RESOURCES[trader.requestedResource];

      this.add.rectangle(startX, y, width / 2 - 40, 64, 0xFFFFFF, 0.92)
        .setStrokeStyle(1, 0xE5A0BC);

      this.add.text(startX - 170, y - 18, `${trader.avatarIcon} ${trader.name} (${trader.islandName})`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#332924'
      });

      this.add.text(startX - 170, y + 5, `Offers: ${trader.offeredQuantity}x ${offeredDef.symbol} ${offeredDef.name}  ➜  Needs: ${trader.requestedQuantity}x ${requestedDef.symbol} ${requestedDef.name}`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '10.5px',
        color: '#64748B'
      });

      const canAfford = this.state.resourceSystem.getCount(trader.requestedResource) >= trader.requestedQuantity;
      const canTrade = this.state.tradeSystem.canTrade();

      const btn = this.add.rectangle(startX + 150, y, 66, 30, (canAfford && canTrade) ? 0x546B43 : 0xCBD5E1)
        .setInteractive({ useHandCursor: canAfford && canTrade });

      this.add.text(startX + 150, y, 'Trade', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const result = this.state.tradeSystem.executeTrade(trader.id, this.state.resourceSystem);
        if (result.success) {
          this.state.soundSystem.playTradeCompleted();
          this.feedbackText.setText(`✅ ${result.message}`);
        } else {
          this.state.soundSystem.playAlarm();
          this.feedbackText.setText(`⚠️ ${result.message}`);
        }
        this.hud.refresh();
        this.scene.restart();
      });
    });
  }

  private renderTaskBoard(width: number): void {
    const tasks = this.state.scoringSystem.getAvailableTasks();
    const startX = width * 0.75 + 15;
    const startY = 150;

    const level = this.state.scoringSystem.getLevel();
    this.add.text(startX, startY - 12, `📋 LEVEL ${level} DEVELOPMENT TASKS`, {
      fontFamily: 'Cinzel, Georgia',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
      letterSpacing: 1.5
    }).setOrigin(0.5);

    if (this.state.scoringSystem.hasCompletedTaskThisRound()) {
      this.add.rectangle(startX, startY + 80, width / 2 - 40, 90, 0xFFFFFF, 0.92)
        .setStrokeStyle(1.5, 0x546B43);
      this.add.text(startX, startY + 80, '✅ Development Task completed for this round!\nReturn to the Island to advance rounds.', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        align: 'center',
        color: '#546B43'
      }).setOrigin(0.5);
      return;
    }

    tasks.slice(0, 3).forEach((task: DevelopmentTask, idx) => {
      const y = startY + 18 + idx * 76;
      const canAfford = this.state.resourceSystem.canAfford(task.cost);

      this.add.rectangle(startX, y, width / 2 - 40, 64, 0xFFFFFF, 0.92)
        .setStrokeStyle(1, canAfford ? 0xB86D4F : 0xE5A0BC);

      this.add.text(startX - 170, y - 18, `${task.symbol} ${task.name} (+${task.points} pts)`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#332924'
      });

      const costStr = Object.entries(task.cost)
        .map(([res, amt]) => `${amt}x ${RESOURCES[res as ResourceId]?.symbol || ''} ${RESOURCES[res as ResourceId]?.name || res}`)
        .join(', ');

      this.add.text(startX - 170, y + 5, `Cost: ${costStr}`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '10.5px',
        color: '#64748B'
      });

      const btn = this.add.rectangle(startX + 150, y, 66, 30, canAfford ? 0xB86D4F : 0xCBD5E1)
        .setInteractive({ useHandCursor: canAfford });

      this.add.text(startX + 150, y, 'Build', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const res = this.state.scoringSystem.completeTask(task.id, this.state.resourceSystem);
        if (res.success) {
          this.state.soundSystem.playSuccessFanfare();
          this.feedbackText.setText(`✨ ${res.message}`);
        } else {
          this.state.soundSystem.playAlarm();
          this.feedbackText.setText(`⚠️ ${res.message}`);
        }
        this.hud.refresh();
        this.scene.restart();
      });
    });
  }
}
