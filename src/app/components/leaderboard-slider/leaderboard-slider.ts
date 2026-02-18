import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FunZoneService, MonthlyLeaderboard, LeaderboardEntry } from '../../services/funzone';

@Component({
  selector: 'app-leaderboard-slider',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leaderboard-slider" *ngIf="hasData">
      <div class="leaderboard-header">
        <h3>🏆 Mjesečni Leaderboard</h3>
        <div class="game-tabs">
          <button
            *ngFor="let game of games"
            [class.active]="currentGame === game.id"
            (click)="selectGame(game.id)"
          >
            {{ game.emoji }} {{ game.name }}
          </button>
        </div>
      </div>

      <div class="leaderboard-content">
        <div class="leaderboard-list" *ngIf="currentEntries.length > 0">
          <div
            class="leaderboard-entry"
            *ngFor="let entry of currentEntries; let i = index"
            [class.gold]="i === 0"
            [class.silver]="i === 1"
            [class.bronze]="i === 2"
          >
            <span class="rank">
              <span *ngIf="i === 0">🥇</span>
              <span *ngIf="i === 1">🥈</span>
              <span *ngIf="i === 2">🥉</span>
              <span *ngIf="i > 2">{{ i + 1 }}</span>
            </span>
            <span class="name">{{ entry.displayName }}</span>
            <span class="score">{{ entry.score }} {{ getScoreLabel() }}</span>
          </div>
        </div>

        <div class="no-data" *ngIf="currentEntries.length === 0">
          <p>Još nema rezultata za {{ getCurrentGameName() }}.</p>
          <p>Budi prvi na ljestvici! 🚀</p>
        </div>
      </div>

      <div class="leaderboard-footer">
        <span class="month-label">{{ currentMonth }}</span>
      </div>
    </div>

    <div class="leaderboard-empty" *ngIf="!hasData && !loading">
      <p>🏆 Leaderboard će se pojaviti nakon prvih igara!</p>
    </div>

    <div class="leaderboard-loading" *ngIf="loading">
      <span>Učitavanje ljestvice...</span>
    </div>
  `,
  styles: [
    `
      .leaderboard-slider {
        background: var(--color-surface, white);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
      }

      .leaderboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 15px;
      }

      .leaderboard-header h3 {
        margin: 0;
        color: var(--color-text, #333);
        font-size: 1.3rem;
      }

      .game-tabs {
        display: flex;
        gap: 8px;
      }

      .game-tabs button {
        padding: 8px 16px;
        border: 2px solid var(--color-primary, #345aaa);
        background: transparent;
        color: var(--color-primary, #345aaa);
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .game-tabs button:hover {
        background: var(--color-background, #f5f5f5);
      }

      .game-tabs button.active {
        background: var(--color-primary, #345aaa);
        color: white;
      }

      .leaderboard-content {
        min-height: 200px;
      }

      .leaderboard-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .leaderboard-entry {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        background: var(--color-background, #f5f5f5);
        border-radius: 10px;
        transition: transform 0.2s ease;
      }

      .leaderboard-entry:hover {
        transform: translateX(5px);
      }

      .leaderboard-entry.gold {
        background: linear-gradient(135deg, #ffd700, #ffec8b);
        font-weight: 700;
      }

      .leaderboard-entry.silver {
        background: linear-gradient(135deg, #c0c0c0, #e8e8e8);
        font-weight: 600;
      }

      .leaderboard-entry.bronze {
        background: linear-gradient(135deg, #cd7f32, #daa06d);
        font-weight: 600;
      }

      .rank {
        width: 40px;
        font-size: 1.2rem;
        text-align: center;
      }

      .name {
        flex: 1;
        color: var(--color-text, #333);
      }

      .score {
        font-weight: 700;
        color: var(--color-primary, #345aaa);
      }

      .leaderboard-entry.gold .name,
      .leaderboard-entry.gold .score,
      .leaderboard-entry.silver .name,
      .leaderboard-entry.silver .score,
      .leaderboard-entry.bronze .name,
      .leaderboard-entry.bronze .score {
        color: #333;
      }

      .leaderboard-footer {
        text-align: center;
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid var(--color-border, #eee);
      }

      .month-label {
        font-size: 0.9rem;
        color: var(--color-textSecondary, #666);
      }

      .no-data {
        text-align: center;
        padding: 40px 20px;
        color: var(--color-textSecondary, #666);
      }

      .no-data p {
        margin: 5px 0;
      }

      .leaderboard-empty,
      .leaderboard-loading {
        background: var(--color-surface, white);
        border-radius: 16px;
        padding: 40px 20px;
        text-align: center;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        color: var(--color-textSecondary, #666);
      }

      @media (max-width: 600px) {
        .leaderboard-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .game-tabs {
          width: 100%;
          overflow-x: auto;
        }

        .game-tabs button {
          flex-shrink: 0;
        }
      }
    `,
  ],
})
export class LeaderboardSliderComponent implements OnInit, OnDestroy {
  leaderboard: MonthlyLeaderboard | null = null;
  currentGame: 'bingo' | 'quiz' | 'snake' = 'snake';
  currentEntries: LeaderboardEntry[] = [];
  loading = true;
  hasData = false;
  currentMonth = '';

  private autoRotateInterval: any;
  private isBrowser: boolean;

  games = [
    { id: 'snake' as const, name: 'Snake', emoji: '🐍' },
    { id: 'quiz' as const, name: 'Kviz', emoji: '❓' },
    { id: 'bingo' as const, name: 'Bingo', emoji: '🎯' },
  ];

  constructor(
    private funZoneService: FunZoneService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    this.setCurrentMonth();

    if (this.isBrowser) {
      await this.loadLeaderboard();
      this.startAutoRotate();
    } else {
      // For SSR, set loading to false immediately
      this.loading = false;
    }
  }

  ngOnDestroy() {
    if (this.autoRotateInterval) {
      clearInterval(this.autoRotateInterval);
    }
  }

  private setCurrentMonth() {
    const months = [
      'Januar',
      'Februar',
      'Mart',
      'April',
      'Maj',
      'Juni',
      'Juli',
      'August',
      'Septembar',
      'Oktobar',
      'Novembar',
      'Decembar',
    ];
    const now = new Date();
    this.currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  async loadLeaderboard() {
    this.loading = true;
    this.cdr.detectChanges();

    try {
      this.leaderboard = await this.funZoneService.getLeaderboard();
      console.log('Leaderboard loaded:', this.leaderboard);
      this.hasData = !!(
        this.leaderboard &&
        (this.leaderboard.bingo.length > 0 ||
          this.leaderboard.quiz.length > 0 ||
          this.leaderboard.snake.length > 0)
      );

      // Immediately update entries for current game
      this.updateCurrentEntries();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.hasData = false;
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  selectGame(game: 'bingo' | 'quiz' | 'snake') {
    this.currentGame = game;
    this.updateCurrentEntries();
  }

  private updateCurrentEntries() {
    if (!this.leaderboard) {
      this.currentEntries = [];
      return;
    }

    this.currentEntries = this.leaderboard[this.currentGame] || [];
  }

  private startAutoRotate() {
    // Auto-rotate every 4 seconds
    this.autoRotateInterval = setInterval(() => {
      const currentIndex = this.games.findIndex((g) => g.id === this.currentGame);
      const nextIndex = (currentIndex + 1) % this.games.length;
      this.currentGame = this.games[nextIndex].id;
      this.updateCurrentEntries();
      this.cdr.detectChanges();
    }, 4000);
  }

  getCurrentGameName(): string {
    return this.games.find((g) => g.id === this.currentGame)?.name || '';
  }

  getScoreLabel(): string {
    switch (this.currentGame) {
      case 'bingo':
        return 'pobjeda';
      case 'quiz':
        return '%';
      case 'snake':
        return 'bodova';
      default:
        return '';
    }
  }
}
