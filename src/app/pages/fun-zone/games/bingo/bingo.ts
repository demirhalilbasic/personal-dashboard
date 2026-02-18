import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';
import { FunZoneService, BingoStats } from '../../../../services/funzone';

interface BingoCell {
  text: string;
  free: boolean;
  marked: boolean;
}

@Component({
  selector: 'app-bingo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bingo.html',
  styleUrls: ['./bingo.css'],
})
export class BingoComponent implements OnInit, OnDestroy {
  BINGO_SIZE = 5;
  FREE_TEXT = 'SLOBODAN PROSTOR';
  winShown = false;
  statusText = '';
  showOverlay = false;
  winType = '';
  currentTheme: any;

  // Timer & Stats
  gameStartTime: number = 0;
  elapsedTime: string = '00:00';
  private timerInterval: any;
  gameInProgress = false;

  // Statistics
  stats: BingoStats | null = null;
  showStatsPanel = false;
  savingStats = false;

  statements = [
    'Putovao je van zemlje.',
    'Letio je avionom.',
    'Ima više od troje braće i sestara.',
    'Ima pet ili više kućnih ljubimaca.',
    'Voli jesti kisele krastavce.',
    'Igra košarku.',
    'Voli Disney-eve crtane filmove.',
    'Voli crtati.',
    'Voli HTML.',
    'Zna roniti.',
    'Omiljena boja je narandžasta.',
    'Ne voli plažu.',
    'Dobar je u matematici.',
    'Nema kućne ljubimce.',
    'Ne voli čokoladu.',
    'Boji se pauka.',
    'Voli peći kolačiće.',
    'Svira instrument.',
    'Alergičan je na mačke ili pse.',
    'Slavi rođendan u oktobru.',
    'Voli jesti sir.',
    'Igra online igre.',
    'Ne voli pizzu.',
    'Voli pjevati.',
    'Ima tetovažu.',
    'Gleda SF filmove.',
    'Koristi Linux.',
    'Piše dnevnik.',
    'Trči 5km redovno.',
    'Zna dva strana jezika.',
  ];

  cells: BingoCell[][] = [];
  private isBrowser: boolean;

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
    this.generateCard();

    // Load user stats
    if (this.isBrowser) {
      await this.loadStats();
    }
  }

  ngOnDestroy() {
    this.stopTimer();
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

  async loadStats() {
    try {
      this.stats = await this.funZoneService.getBingoStats();
    } catch (error) {
      console.error('Error loading bingo stats:', error);
    }
  }

  shuffle(arr: string[]): string[] {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  generateCard() {
    this.statusText = '';
    this.winShown = false;
    this.showOverlay = false;

    // Start timer for new game
    this.startTimer();

    const pool = this.shuffle(this.statements);
    const needed = this.BINGO_SIZE * this.BINGO_SIZE - 1;
    const chosen = pool.slice(0, needed);

    this.cells = [];
    let idx = 0;

    for (let r = 0; r < this.BINGO_SIZE; r++) {
      const row: BingoCell[] = [];
      for (let c = 0; c < this.BINGO_SIZE; c++) {
        if (r === 2 && c === 2) {
          row.push({ text: this.FREE_TEXT, free: true, marked: true });
        } else {
          row.push({ text: chosen[idx++], free: false, marked: false });
        }
      }
      this.cells.push(row);
    }
  }

  // Timer functions
  private startTimer() {
    this.stopTimer();
    this.gameStartTime = Date.now();
    this.gameInProgress = true;
    this.elapsedTime = '00:00';

    // Run timer inside NgZone to ensure Angular detects changes
    this.ngZone.runOutsideAngular(() => {
      this.timerInterval = setInterval(() => {
        this.ngZone.run(() => {
          const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;
          this.elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;
          this.cdr.detectChanges();
        });
      }, 1000);
    });
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.gameInProgress = false;
  }

  private getGameTimeSeconds(): number {
    if (!this.gameStartTime) return 0;
    return Math.floor((Date.now() - this.gameStartTime) / 1000);
  }

  toggleCell(cell: BingoCell) {
    cell.marked = !cell.marked;
    this.checkWin();
  }

  checkWin() {
    const grid: boolean[][] = this.cells.map((row) => row.map((cell) => cell.marked));

    // Check rows
    for (let r = 0; r < this.BINGO_SIZE; r++) {
      if (grid[r].every((v) => v)) {
        this.declareWin(`Red ${r + 1}`);
        return;
      }
    }

    // Check columns
    for (let c = 0; c < this.BINGO_SIZE; c++) {
      let colOk = true;
      for (let r = 0; r < this.BINGO_SIZE; r++) {
        if (!grid[r][c]) {
          colOk = false;
          break;
        }
      }
      if (colOk) {
        this.declareWin(`Kolona ${c + 1}`);
        return;
      }
    }

    // Check diagonal TL-BR
    const diag1 = Array.from({ length: this.BINGO_SIZE }, (_, i) => grid[i][i]);
    if (diag1.every((v) => v)) {
      this.declareWin('Dijagonala 1');
      return;
    }

    // Check diagonal TR-BL
    const diag2 = Array.from(
      { length: this.BINGO_SIZE },
      (_, i) => grid[i][this.BINGO_SIZE - 1 - i]
    );
    if (diag2.every((v) => v)) {
      this.declareWin('Dijagonala 2');
      return;
    }
  }

  async declareWin(type: string) {
    if (this.winShown) return;
    this.winShown = true;
    this.stopTimer();

    const gameTime = this.getGameTimeSeconds();
    this.statusText = `BINGO! ${type} kompletiran za ${this.elapsedTime}.`;
    this.winType = type;
    this.showOverlay = true;

    // Save stats to Firestore
    this.savingStats = true;
    try {
      await this.funZoneService.updateBingoStats(true, gameTime);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving bingo stats:', error);
    } finally {
      this.savingStats = false;
    }
  }

  resetMarks() {
    this.statusText = '';
    this.winShown = false;
    this.showOverlay = false;

    this.cells.forEach((row) => {
      row.forEach((cell) => {
        if (!cell.free) {
          cell.marked = false;
        }
      });
    });

    // Restart timer
    this.startTimer();
  }

  exportPdf() {
    window.print();
  }

  closeOverlay() {
    this.showOverlay = false;
  }

  newGame() {
    this.generateCard();
    this.closeOverlay();
  }

  resetFromOverlay() {
    this.resetMarks();
    this.closeOverlay();
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  formatTime(seconds: number | null): string {
    if (seconds === null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatTotalTime(seconds: number): string {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
