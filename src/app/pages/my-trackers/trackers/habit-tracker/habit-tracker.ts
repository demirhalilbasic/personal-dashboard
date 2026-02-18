import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';
import { TrackerService, TrackerConfig, HabitEntry } from '../../../../services/tracker';

interface Habit {
  name: string;
  completed: boolean;
  streak: number;
}

@Component({
  selector: 'app-habit-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './habit-tracker.html',
  styleUrls: ['./habit-tracker.css'],
})
export class HabitTrackerComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  tracker: TrackerConfig | null = null;

  // Data
  selectedDate: string = new Date().toISOString().split('T')[0];
  habits: Habit[] = [];
  newHabitName: string = '';

  // Stats
  streak: number = 0;
  weeklyProgress: number = 0;
  monthlyProgress: number = 0;
  weeklyData: { day: string; completed: number; total: number }[] = [];

  // State
  isLoading = true;
  isSaving = false;
  showAddHabit = false;
  showDatePicker = false;

  // Date navigation
  dateOptions: string[] = [];

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private trackerService: TrackerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.generateDateOptions();
  }

  async ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.applyTheme();
    this.tracker = this.trackerService.getTrackerById('habit') || null;

    if (this.isBrowser) {
      await this.loadData();
    }
  }

  private generateDateOptions() {
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      this.dateOptions.push(date.toISOString().split('T')[0]);
    }
  }

  async loadData() {
    this.isLoading = true;
    try {
      // Load entry for selected date
      const entry = await this.trackerService.getTrackerEntry('habit', this.selectedDate);
      if (entry) {
        this.habits = entry.data.habits || [];
      } else {
        // Load habits structure from previous entries
        const previousEntries = await this.trackerService.getTrackerEntriesRange(
          'habit',
          this.dateOptions[this.dateOptions.length - 1],
          this.dateOptions[0]
        );
        if (previousEntries.length > 0) {
          const lastEntry = previousEntries[previousEntries.length - 1];
          this.habits = lastEntry.data.habits.map((h: Habit) => ({
            name: h.name,
            completed: false,
            streak: h.streak,
          }));
        } else {
          this.habits = [];
        }
      }

      // Load stats
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error loading habit data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('habit');

      const weeklyStats = await this.trackerService.getWeeklyStats('habit');
      this.weeklyProgress = Math.round((weeklyStats.completedDays / weeklyStats.totalDays) * 100);

      const today = new Date();
      const monthlyStats = await this.trackerService.getMonthlyStats(
        'habit',
        today.getFullYear(),
        today.getMonth()
      );
      this.monthlyProgress = Math.round(
        (monthlyStats.completedDays / monthlyStats.totalDays) * 100
      );
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadWeeklyData() {
    this.weeklyData = [];
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = await this.trackerService.getTrackerEntry('habit', dateStr);

      let completed = 0;
      let total = 0;
      if (entry && entry.data.habits) {
        total = entry.data.habits.length;
        completed = entry.data.habits.filter((h: Habit) => h.completed).length;
      }

      this.weeklyData.push({
        day: dayNames[date.getDay()],
        completed,
        total,
      });
    }
  }

  async toggleHabit(index: number) {
    this.habits[index].completed = !this.habits[index].completed;
    if (this.habits[index].completed) {
      this.habits[index].streak++;
    } else if (this.habits[index].streak > 0) {
      this.habits[index].streak--;
    }
    await this.saveData();
  }

  async addHabit() {
    if (this.newHabitName.trim()) {
      this.habits.push({
        name: this.newHabitName.trim(),
        completed: false,
        streak: 0,
      });
      this.newHabitName = '';
      this.showAddHabit = false;
      await this.saveData();
    }
  }

  async removeHabit(index: number) {
    this.habits.splice(index, 1);
    await this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const allCompleted = this.habits.length > 0 && this.habits.every((h) => h.completed);
      await this.trackerService.saveTrackerEntry(
        'habit',
        this.selectedDate,
        {
          habits: this.habits,
        },
        allCompleted
      );
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error saving habit data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  async changeDate(newDate: string) {
    this.selectedDate = newDate;
    await this.loadData();
  }

  getCompletionPercentage(): number {
    if (this.habits.length === 0) return 0;
    const completed = this.habits.filter((h) => h.completed).length;
    return Math.round((completed / this.habits.length) * 100);
  }

  getCompletedHabitsCount(): number {
    return this.habits.filter((h) => h.completed).length;
  }

  getBarHeight(data: { completed: number; total: number }): number {
    if (data.total === 0) return 5;
    return Math.max(5, (data.completed / data.total) * 100);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return d.toLocaleDateString('hr-HR', options);
  }

  formatDateShort(date: string): string {
    const d = new Date(date);
    const today = new Date();
    if (date === today.toISOString().split('T')[0]) {
      return 'Danas, ' + d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('hr-HR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getDayName(date: string): string {
    const d = new Date(date);
    const today = new Date();
    if (date === today.toISOString().split('T')[0]) return 'Danas';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === yesterday.toISOString().split('T')[0]) return 'Jučer';
    return d.toLocaleDateString('hr-HR', { weekday: 'long' });
  }

  isToday(date: string): boolean {
    return date === new Date().toISOString().split('T')[0];
  }

  toggleDatePicker() {
    this.showDatePicker = !this.showDatePicker;
  }

  closeDatePicker() {
    this.showDatePicker = false;
  }

  async selectDate(date: string) {
    this.selectedDate = date;
    this.showDatePicker = false;
    await this.loadData();
  }

  private applyTheme() {
    if (!this.isBrowser || !this.currentTheme) return;

    const root = document.documentElement;
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }
}
