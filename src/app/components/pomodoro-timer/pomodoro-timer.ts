import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PomodoroService, PomodoroSession } from '../../services/pomodoro';
import { ThemeService, Theme } from '../../services/theme';

@Component({
  selector: 'app-pomodoro-timer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pomodoro-timer.html',
  styleUrl: './pomodoro-timer.css',
})
export class PomodoroTimerComponent implements OnInit, OnDestroy {
  private pomodoroService = inject(PomodoroService);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);

  // Expose Math to template
  Math = Math;

  session: PomodoroSession | null = null;
  currentTheme: Theme | null = null;

  // Setup form
  selectedSubject = '';
  sessionDuration = 25;
  breakDuration = 5;

  // Available options
  subjects: string[] = [];
  durationOptions = [15, 20, 25, 30, 45, 60];
  breakOptions = [5, 10, 15];

  private updateInterval: any = null;

  constructor() {
    // React to session changes
    effect(() => {
      this.session = this.pomodoroService.getSessionSignal()();
      this.cdr.detectChanges();
    });
  }

  ngOnInit(): void {
    this.subjects = this.pomodoroService.subjects;
    this.currentTheme = this.themeService.getCurrentTheme();
    this.selectedSubject = this.subjects[0];

    // Load any existing session
    this.pomodoroService.loadSession();

    // Update UI every second when session is active
    this.updateInterval = setInterval(() => {
      if (this.pomodoroService.isSessionActive()) {
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  async startSession(): Promise<void> {
    if (!this.selectedSubject) return;
    await this.pomodoroService.startNewSession(
      this.selectedSubject,
      this.sessionDuration,
      this.breakDuration
    );
  }

  async pauseSession(): Promise<void> {
    await this.pomodoroService.pauseSession();
  }

  async resumeSession(): Promise<void> {
    await this.pomodoroService.resumeSession();
  }

  async startBreak(): Promise<void> {
    await this.pomodoroService.startBreak();
  }

  async continueSession(): Promise<void> {
    await this.pomodoroService.continueSession();
  }

  async endSession(): Promise<void> {
    await this.pomodoroService.endSession();
  }

  formatTime(seconds: number): string {
    return this.pomodoroService.formatTime(seconds);
  }

  getProgressPercent(): number {
    if (!this.session) return 0;

    let total: number;
    if (this.session.state === 'countdown') {
      total = 5;
    } else if (this.session.state === 'break') {
      total = this.session.breakDuration * 60;
    } else {
      total = this.session.sessionDuration * 60;
    }

    return ((total - this.session.remainingSeconds) / total) * 100;
  }

  getStateLabel(): string {
    if (!this.session) return '';

    switch (this.session.state) {
      case 'countdown':
        return 'Priprema...';
      case 'focus':
        return '🎯 Fokus';
      case 'break':
        return '☕ Pauza';
      case 'paused':
        return '⏸️ Pauzirano';
      case 'finished':
        return '✅ Završeno';
      default:
        return '';
    }
  }

  getStateEmoji(): string {
    if (!this.session) return '🍅';

    switch (this.session.state) {
      case 'countdown':
        return '⏳';
      case 'focus':
        return '🎯';
      case 'break':
        return '☕';
      case 'paused':
        return '⏸️';
      case 'finished':
        return '✅';
      default:
        return '🍅';
    }
  }

  isBlocking(): boolean {
    return this.pomodoroService.isBlocking();
  }
}
