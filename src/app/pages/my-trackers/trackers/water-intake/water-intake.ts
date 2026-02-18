import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { TrackerService, TrackerConfig, WaterEntry } from '../../../../services/tracker';

@Component({
  selector: 'app-water-intake',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './water-intake.html',
  styleUrls: ['./water-intake.css'],
})
export class WaterIntakeComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  tracker: TrackerConfig | null = null;

  selectedDate: string = this.getLocalDateString(new Date());
  glasses: number = 0;
  goal: number = 8;
  times: string[] = [];

  streak: number = 0;
  weeklyProgress: number = 0;
  monthlyProgress: number = 0;
  weeklyData: { day: string; glasses: number }[] = [];

  isLoading = true;
  isSaving = false;
  showDatePicker = false;
  dateOptions: string[] = [];

  // Visual glasses array for animation
  glassesArray: boolean[] = [];

  constructor(
    private themeService: ThemeService,
    private trackerService: TrackerService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.generateDateOptions();
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    if (!this.currentTheme) {
      this.currentTheme = this.themeService.loadSavedTheme();
    }
    this.applyTheme();
    this.tracker = this.trackerService.getTrackerById('water') || null;
    this.updateGlassesArray();

    if (this.isBrowser) {
      await this.loadData();
    }
  }

  private generateDateOptions() {
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      this.dateOptions.push(this.getLocalDateString(date));
    }
  }

  async loadData() {
    this.isLoading = true;
    try {
      const entry = await this.trackerService.getTrackerEntry('water', this.selectedDate);
      if (entry) {
        this.glasses = entry.data.glasses || 0;
        this.goal = entry.data.goal || 8;
        this.times = entry.data.times || [];
      } else {
        this.glasses = 0;
        this.times = [];
      }
      this.updateGlassesArray();
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error loading water data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('water');
      const weeklyStats = await this.trackerService.getWeeklyStats('water');
      this.weeklyProgress = Math.round((weeklyStats.completedDays / weeklyStats.totalDays) * 100);
      const today = new Date();
      const monthlyStats = await this.trackerService.getMonthlyStats(
        'water',
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
      const dateStr = this.getLocalDateString(date);
      const entry = await this.trackerService.getTrackerEntry('water', dateStr);

      this.weeklyData.push({
        day: dayNames[date.getDay()],
        glasses: entry?.data.glasses || 0,
      });
    }
  }

  updateGlassesArray() {
    this.glassesArray = Array(this.goal)
      .fill(false)
      .map((_, i) => i < this.glasses);
  }

  async setGlasses(count: number) {
    // Directly set glasses to the clicked number
    const previousCount = this.glasses;
    this.glasses = count;

    // Adjust times array
    if (count > previousCount) {
      // Add new times for each new glass
      const currentTime = new Date().toLocaleTimeString('hr-HR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      for (let i = previousCount; i < count; i++) {
        this.times.push(currentTime);
      }
    } else if (count < previousCount) {
      // Remove times from the end
      this.times = this.times.slice(0, count);
    }

    this.updateGlassesArray();
    await this.saveData();
  }

  async addGlass() {
    if (this.glasses < this.goal) {
      this.glasses++;
      this.times.push(
        new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })
      );
      this.updateGlassesArray();
      await this.saveData();
    }
  }

  async removeGlass() {
    if (this.glasses > 0) {
      this.glasses--;
      this.times.pop();
      this.updateGlassesArray();
      await this.saveData();
    }
  }

  async setGoal(newGoal: number) {
    this.goal = newGoal;
    this.updateGlassesArray();
    await this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      await this.trackerService.saveTrackerEntry(
        'water',
        this.selectedDate,
        {
          glasses: this.glasses,
          goal: this.goal,
          times: this.times,
        },
        this.glasses > 0 // Mark as completed if at least 1 glass was logged
      );
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error saving water data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  async changeDate(newDate: string) {
    this.selectedDate = newDate;
    await this.loadData();
  }

  getProgressPercentage(): number {
    return Math.min(100, Math.round((this.glasses / this.goal) * 100));
  }

  getWaterLevel(): number {
    return Math.min(100, (this.glasses / this.goal) * 100);
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('hr-HR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateShort(date: string): string {
    const d = new Date(date);
    const today = new Date();
    if (date === this.getLocalDateString(today)) {
      return 'Danas, ' + d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
    }
    return d.toLocaleDateString('hr-HR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getDayName(date: string): string {
    const d = new Date(date);
    const today = new Date();
    if (date === this.getLocalDateString(today)) return 'Danas';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date === this.getLocalDateString(yesterday)) return 'Jučer';
    return d.toLocaleDateString('hr-HR', { weekday: 'long' });
  }

  isToday(date: string): boolean {
    return date === this.getLocalDateString(new Date());
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
