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

    // Haat Pavilion Marketplace Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1e1b4b, 0x1e1b4b, 0x0f172a, 0x0f172a, 1);
    bg.fillRect(0, 0, width, height);

    // Decorative Haat canopy arches
    const canopy = this.add.rectangle(width / 2, 85, width - 40, 44, 0xd97706, 0.85)
      .setStrokeStyle(1.5, 0xfde047);
    this.add.text(width / 2, 85, '🏪 CENTRAL CULTURAL HAAT • INTER-ISLAND TRADING & DEVELOPMENT', {
      fontFamily: 'Cinzel, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Initialize HUD
    this.hud = new HUD(this);

    // Feedback status banner
    this.feedbackText = this.add.text(width / 2, 125, `Trades Remaining this round: ${this.state.tradeSystem.getRemainingTrades()} / 2`, {
      fontFamily: 'Plus Jakarta Sans',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#38bdf8'
    }).setOrigin(0.5);

    // Left Column: Traders Stall
    this.renderTraderStalls(width, height);

    // Right Column: Development Tasks Board
    this.renderTaskBoard(width, height);

    // Bottom Return Button
    const returnBtn = this.add.rectangle(width / 2, height - 40, 240, 44, 0x0284c7)
      .setStrokeStyle(1.5, 0x38bdf8)
      .setInteractive({ useHandCursor: true });

    const returnTxt = this.add.text(width / 2, height - 40, '← RETURN TO ISLAND', {
      fontFamily: 'Cinzel, serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    returnBtn.on('pointerdown', () => {
      this.state.soundSystem.playTileClick();
      this.scene.start('IslandScene');
    });
  }

  private renderTraderStalls(width: number, height: number): void {
    const traders = this.state.tradeSystem.getTraders();
    const startX = width / 4 - 20;
    const startY = 160;

    this.add.text(startX, startY - 15, '🤝 VISITING ISLAND TRADERS', {
      fontFamily: 'Cinzel',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5);

    traders.forEach((trader, idx) => {
      const y = startY + 20 + idx * 80;
      const offeredDef = RESOURCES[trader.offeredResource];
      const requestedDef = RESOURCES[trader.requestedResource];

      const stallCard = this.add.rectangle(startX, y, width / 2 - 40, 68, 0x0f172a, 0.9)
        .setStrokeStyle(1, 0x334155);

      // Trader Avatar & Name
      this.add.text(startX - 180, y - 20, `${trader.avatarIcon} ${trader.name} (${trader.islandName})`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f8fafc'
      });

      // Trade offer string
      this.add.text(startX - 180, y + 5, `Offers: ${trader.offeredQuantity}x ${offeredDef.symbol} ${offeredDef.name}  ➜  Needs: ${trader.requestedQuantity}x ${requestedDef.symbol} ${requestedDef.name}`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '11px',
        color: '#94a3b8'
      });

      // Trade Button
      const canAfford = this.state.resourceSystem.getCount(trader.requestedResource) >= trader.requestedQuantity;
      const canTrade = this.state.tradeSystem.canTrade();

      const btn = this.add.rectangle(startX + 150, y, 70, 34, (canAfford && canTrade) ? 0x15803d : 0x334155)
        .setStrokeStyle(1, (canAfford && canTrade) ? 0x4ade80 : 0x64748b)
        .setInteractive({ useHandCursor: canAfford && canTrade });

      const btnText = this.add.text(startX + 150, y, 'Trade', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const result = this.state.tradeSystem.executeTrade(trader.id, this.state.resourceSystem);
        if (result.success) {
          this.state.soundSystem.playTradeCompleted();
          this.feedbackText.setText(`✅ ${result.message}`);
          this.feedbackText.setColor('#4ade80');
        } else {
          this.state.soundSystem.playAlarm();
          this.feedbackText.setText(`⚠️ ${result.message}`);
          this.feedbackText.setColor('#f87171');
        }
        this.hud.refresh();
        this.scene.restart();
      });
    });
  }

  private renderTaskBoard(width: number, height: number): void {
    const tasks = this.state.scoringSystem.getAvailableTasks();
    const startX = width * 0.75 + 10;
    const startY = 160;

    const level = this.state.scoringSystem.getLevel();
    this.add.text(startX, startY - 15, `📋 LEVEL ${level} DEVELOPMENT TASKS`, {
      fontFamily: 'Cinzel',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fbbf24'
    }).setOrigin(0.5);

    if (this.state.scoringSystem.hasCompletedTaskThisRound()) {
      const doneBox = this.add.rectangle(startX, startY + 80, width / 2 - 40, 100, 0x064e3b, 0.8)
        .setStrokeStyle(1.5, 0x34d399);
      this.add.text(startX, startY + 80, '✅ Development Task completed for this round!\nEarned task development points.\nAdvance to next round from the Island map.', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '13px',
        align: 'center',
        color: '#a7f3d0'
      }).setOrigin(0.5);
      return;
    }

    tasks.slice(0, 3).forEach((task: DevelopmentTask, idx) => {
      const y = startY + 20 + idx * 80;
      const canAfford = this.state.resourceSystem.canAfford(task.cost);

      const taskCard = this.add.rectangle(startX, y, width / 2 - 40, 68, 0x0f172a, 0.9)
        .setStrokeStyle(1, canAfford ? 0xf59e0b : 0x334155);

      // Task Name & Points
      this.add.text(startX - 180, y - 20, `${task.symbol} ${task.name} (+${task.points} pts)`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fbbf24'
      });

      // Cost Breakdown
      const costStr = Object.entries(task.cost)
        .map(([res, amt]) => `${amt}x ${RESOURCES[res as ResourceId]?.symbol || ''} ${RESOURCES[res as ResourceId]?.name || res}`)
        .join(', ');

      this.add.text(startX - 180, y + 5, `Cost: ${costStr}`, {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '11px',
        color: '#cbd5e1'
      });

      // Build Task Button
      const btn = this.add.rectangle(startX + 150, y, 70, 34, canAfford ? 0xd97706 : 0x334155)
        .setStrokeStyle(1, canAfford ? 0xfde047 : 0x64748b)
        .setInteractive({ useHandCursor: canAfford });

      this.add.text(startX + 150, y, 'Build', {
        fontFamily: 'Plus Jakarta Sans',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        const res = this.state.scoringSystem.completeTask(task.id, this.state.resourceSystem);
        if (res.success) {
          this.state.soundSystem.playSuccessFanfare();
          this.feedbackText.setText(`✨ ${res.message}`);
          this.feedbackText.setColor('#4ade80');
        } else {
          this.state.soundSystem.playAlarm();
          this.feedbackText.setText(`⚠️ ${res.message}`);
          this.feedbackText.setColor('#f87171');
        }
        this.hud.refresh();
        this.scene.restart();
      });
    });
  }
}
