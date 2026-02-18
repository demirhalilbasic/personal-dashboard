import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';
import { FunZoneService, SnakeStats } from '../../../../services/funzone';

// Snake Game Component with SSR support
interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-snake',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './snake.html',
  styleUrls: ['./snake.css'],
})
export class SnakeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private gridSize = 25;
  private tileCount = 24;
  private snake: Point[] = [];
  private food: Point = { x: 0, y: 0 };
  private dx = 0;
  private dy = 0;
  private gameLoop: any;
  private gameSpeed = 120;
  private logoImg: HTMLImageElement | null = null;
  private isBrowser: boolean;

  score = 0;
  gameOver = false;
  gameStarted = false;
  currentTheme: Theme | null = null;
  showGameOverModal = false;
  showInstructions = false;

  // Statistics
  stats: SnakeStats | null = null;
  showStatsPanel = false;
  isNewHighScore = false;
  savingStats = false;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private funZoneService: FunZoneService,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.applyTheme();

    // Load stats
    if (this.isBrowser) {
      await this.loadStats();
    }

    // Preload logo with proper path (only in browser)
    if (this.isBrowser) {
      this.logoImg = new Image();
      this.logoImg.onload = () => {
        console.log('Snake logo loaded successfully');
      };
      this.logoImg.onerror = () => {
        console.warn('Snake logo failed to load, using fallback');
        this.logoImg = null;
      };
      this.logoImg.src = '/assets/images/whiteboard/logo-ipi-square.png';
    }
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;

    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.gridSize * this.tileCount;
    canvas.height = this.gridSize * this.tileCount;
    this.ctx = canvas.getContext('2d')!;

    this.setupKeyboardControls();
    this.drawInitial();
  }

  private applyTheme() {
    if (!this.isBrowser || !this.currentTheme) return;

    // Apply CSS variables for theme colors
    const root = document.documentElement;
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    // Apply background gradient
    document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }

  ngOnDestroy() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  private drawInitial() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(
      0,
      0,
      this.canvasRef.nativeElement.width,
      this.canvasRef.nativeElement.height
    );

    this.ctx.fillStyle = '#4ecdc4';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      'Pritisnite "Započni igru"',
      this.canvasRef.nativeElement.width / 2,
      this.canvasRef.nativeElement.height / 2
    );
  }

  startGame() {
    if (!this.isBrowser) return;

    this.snake = [{ x: 12, y: 12 }];
    this.dx = 1;
    this.dy = 0;
    this.score = 0;
    this.gameOver = false;
    this.gameStarted = true;
    this.showGameOverModal = false;

    this.generateFood();

    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }

    // Run game loop inside Angular zone so change detection works
    this.gameLoop = setInterval(() => {
      this.update();
      this.cdr.detectChanges();
    }, this.gameSpeed);
  }

  private setupKeyboardControls() {
    if (!this.isBrowser) return;

    document.addEventListener('keydown', (e) => {
      if (!this.gameStarted || this.gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          if (this.dy === 0) {
            this.dx = 0;
            this.dy = -1;
          }
          e.preventDefault();
          break;
        case 'ArrowDown':
          if (this.dy === 0) {
            this.dx = 0;
            this.dy = 1;
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (this.dx === 0) {
            this.dx = -1;
            this.dy = 0;
          }
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (this.dx === 0) {
            this.dx = 1;
            this.dy = 0;
          }
          e.preventDefault();
          break;
      }
    });
  }

  private update() {
    if (this.gameOver) return;

    // Move snake
    const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

    // Check wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.endGame();
      return;
    }

    // Check self collision
    if (this.snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.generateFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(
      0,
      0,
      this.canvasRef.nativeElement.width,
      this.canvasRef.nativeElement.height
    );

    // Draw grid
    this.ctx.strokeStyle = '#16213e';
    for (let i = 0; i <= this.tileCount; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * this.gridSize, 0);
      this.ctx.lineTo(i * this.gridSize, this.canvasRef.nativeElement.height);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, i * this.gridSize);
      this.ctx.lineTo(this.canvasRef.nativeElement.width, i * this.gridSize);
      this.ctx.stroke();
    }

    // Draw food (IPI logo)
    if (this.logoImg && this.logoImg.complete) {
      const logoSize = this.gridSize - 4;
      this.ctx.drawImage(
        this.logoImg,
        this.food.x * this.gridSize + 2,
        this.food.y * this.gridSize + 2,
        logoSize,
        logoSize
      );
    } else {
      // Fallback to red square
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.fillRect(
        this.food.x * this.gridSize + 1,
        this.food.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    }

    // Draw snake
    this.snake.forEach((segment, index) => {
      this.ctx.fillStyle = index === 0 ? '#4ecdc4' : '#45b7aa';
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
    });
  }

  private generateFood() {
    let newFood: Point;
    do {
      newFood = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount),
      };
    } while (this.snake.some((segment) => segment.x === newFood.x && segment.y === newFood.y));

    this.food = newFood;
  }

  private endGame() {
    this.gameOver = true;
    this.showGameOverModal = true;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }

    // Check for new high score
    if (this.stats && this.score > this.stats.highScore) {
      this.isNewHighScore = true;
    }

    // Save stats to Firestore
    this.saveStats();

    this.cdr.detectChanges();
  }

  private async saveStats() {
    this.savingStats = true;
    try {
      await this.funZoneService.updateSnakeStats(this.score);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving snake stats:', error);
    } finally {
      this.savingStats = false;
    }
  }

  async loadStats() {
    try {
      this.stats = await this.funZoneService.getSnakeStats();
    } catch (error) {
      console.error('Error loading snake stats:', error);
    }
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  closeModal() {
    this.showGameOverModal = false;
    this.isNewHighScore = false;
  }
}
