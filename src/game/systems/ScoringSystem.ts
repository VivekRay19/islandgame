import { DevelopmentTask, DEVELOPMENT_TASKS } from '../data/tasks';
import { ResourceSystem } from './ResourceSystem';

export class ScoringSystem {
  private currentRound: number = 1;
  private taskScore: number = 0;
  private eventScore: number = 0;
  private completedTasks: DevelopmentTask[] = [];
  private taskCompletedThisRound: boolean = false;

  public getRound(): number {
    return this.currentRound;
  }

  public getLevel(): 1 | 2 | 3 {
    if (this.currentRound <= 2) return 1;
    if (this.currentRound <= 4) return 2;
    return 3;
  }

  public getAvailableTasks(): DevelopmentTask[] {
    const lvl = this.getLevel();
    return DEVELOPMENT_TASKS.filter(t => t.level === lvl && !this.completedTasks.some(ct => ct.id === t.id));
  }

  public hasCompletedTaskThisRound(): boolean {
    return this.taskCompletedThisRound;
  }

  public completeTask(taskId: string, resourceSystem: ResourceSystem): { success: boolean; message: string; points: number } {
    if (this.taskCompletedThisRound) {
      return { success: false, message: 'You have already completed a development task for this round!', points: 0 };
    }

    const task = DEVELOPMENT_TASKS.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: 'Task not found.', points: 0 };
    }

    if (!resourceSystem.spendCost(task.cost)) {
      return { success: false, message: 'Insufficient resources to construct this development task.', points: 0 };
    }

    this.completedTasks.push(task);
    this.taskScore += task.points;
    this.taskCompletedThisRound = true;

    return {
      success: true,
      message: `Completed "${task.name}"! Gained +${task.points} Development Points!`,
      points: task.points
    };
  }

  public addEventScore(points: number): void {
    this.eventScore += points;
  }

  public getTotalScore(culturalHarmonyScore: number = 0): number {
    return this.taskScore + this.eventScore + culturalHarmonyScore;
  }

  public advanceRound(): { newRound: number; isGameOver: boolean } {
    this.currentRound++;
    this.taskCompletedThisRound = false;
    return {
      newRound: this.currentRound,
      isGameOver: this.currentRound > 6
    };
  }

  public getSummary(culturalHarmonyScore: number) {
    return {
      round: this.currentRound,
      level: this.getLevel(),
      taskScore: this.taskScore,
      eventScore: this.eventScore,
      culturalHarmonyScore,
      totalScore: this.getTotalScore(culturalHarmonyScore),
      completedTasksCount: this.completedTasks.length,
      tasks: this.completedTasks
    };
  }
}
