import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { TrackerService, TrackerConfig } from '../../../../services/tracker';

@Component({
  selector: 'app-sleep-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sleep-tracker.html',
  styleUrls: ['./sleep-tracker.css'],
})
export class SleepTrackerComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  tracker: TrackerConfig | null = null;

  selectedDate: string = new Date().toISOString().split('T')[0];
  bedTime: string = '22:00';
  wakeTime: string = '06:00';
  quality: number = 3;
  notes: string = '';
  hoursSlept: number = 8;

  streak: number = 0;
  weeklyProgress: number = 0;
  weeklyData: { day: string; hours: number; quality: number }[] = [];
  averageHours: number = 0;

  isLoading = true;
  isSaving = false;
  showDatePicker = false;
  dateOptions: string[] = [];

  qualityOptions = [
    { value: 1, label: 'Vrlo loše', emoji: '😫', color: '#F44336' },
    { value: 2, label: 'Loše', emoji: '😴', color: '#FF9800' },
    { value: 3, label: 'Ok', emoji: '😐', color: '#FFC107' },
    { value: 4, label: 'Dobro', emoji: '😊', color: '#8BC34A' },
    { value: 5, label: 'Odlično', emoji: '🌟', color: '#4CAF50' },
  ];

  constructor(
    private themeService: ThemeService,
    private trackerService: TrackerService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.generateDateOptions();
  }

  async ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.applyTheme();
    this.tracker = this.trackerService.getTrackerById('sleep') || null;
    if (this.isBrowser) await this.loadData();
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
      const entry = await this.trackerService.getTrackerEntry('sleep', this.selectedDate);
      if (entry) {
        this.bedTime = entry.data.bedTime || '22:00';
        this.wakeTime = entry.data.wakeTime || '06:00';
        this.quality = entry.data.quality || 3;
        this.notes = entry.data.notes || '';
        this.hoursSlept = entry.data.hoursSlept || this.calculateHours();
      } else {
        this.bedTime = '22:00';
        this.wakeTime = '06:00';
        this.quality = 3;
        this.notes = '';
        this.hoursSlept = 8;
      }
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error loading sleep data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('sleep');
      const weeklyStats = await this.trackerService.getWeeklyStats('sleep');
      this.weeklyProgress = Math.round((weeklyStats.completedDays / weeklyStats.totalDays) * 100);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadWeeklyData() {
    this.weeklyData = [];
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
    let totalHours = 0;
    let count = 0;

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = await this.trackerService.getTrackerEntry('sleep', dateStr);

      const hours = entry?.data.hoursSlept || 0;
      if (hours > 0) {
        totalHours += hours;
        count++;
      }

      this.weeklyData.push({
        day: dayNames[date.getDay()],
        hours,
        quality: entry?.data.quality || 0,
      });
    }
    this.averageHours = count > 0 ? Math.round((totalHours / count) * 10) / 10 : 0;
  }

  calculateHours(): number {
    const bed = this.parseTime(this.bedTime);
    const wake = this.parseTime(this.wakeTime);
    let diff = wake - bed;
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  }

  parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  onTimeChange() {
    this.hoursSlept = this.calculateHours();
  }

  async saveData() {
    this.isSaving = true;
    try {
      await this.trackerService.saveTrackerEntry(
        'sleep',
        this.selectedDate,
        {
          bedTime: this.bedTime,
          wakeTime: this.wakeTime,
          quality: this.quality,
          notes: this.notes,
          hoursSlept: this.hoursSlept,
        },
        true
      );
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error saving sleep data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  async changeDate(newDate: string) {
    this.selectedDate = newDate;
    await this.loadData();
  }

  getQualityEmoji(): string {
    return this.qualityOptions.find((q) => q.value === this.quality)?.emoji || '😐';
  }

  getBarHeight(hours: number): number {
    return Math.min(100, (hours / 10) * 100);
  }

  getQualityColor(quality: number): string {
    return this.qualityOptions.find((q) => q.value === quality)?.color || '#FFC107';
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
