import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, ScreenTimeEntry } from '../../../../services/tracker';

interface AppUsage {
  id: string;
  app: string;
  category: string;
  minutes: number;
}

@Component({
  selector: 'app-screen-time',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './screen-time.html',
  styleUrl: './screen-time.css',
})
export class ScreenTime implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  appUsages: AppUsage[] = [];
  newUsage: Partial<AppUsage> = { app: '', category: '', minutes: 30 };
  dailyLimit = 180;

  streak = 0;
  weeklyProgress = 0;

  categories = [
    { value: 'social', label: '📱 Društvene mreže', color: '#e17055' },
    { value: 'entertainment', label: '🎮 Zabava', color: '#fdcb6e' },
    { value: 'education', label: '📚 Edukacija', color: '#00b894' },
    { value: 'productivity', label: '💼 Produktivnost', color: '#0984e3' },
    { value: 'communication', label: '💬 Komunikacija', color: '#6c5ce7' },
    { value: 'other', label: '📦 Ostalo', color: '#636e72' },
  ];

  weeklyData: { day: string; minutes: number }[] = [];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('screentime');
    this.generateDateOptions();
    this.selectedDate = this.dateOptions[0];
    await this.loadData();
    await this.loadStats();
    this.cdr.detectChanges();
  }

  generateDateOptions() {
    const dates: string[] = [];
    for (let i = 0; i < 8; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    this.dateOptions = dates;
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === today.toISOString().split('T')[0]) return 'Danas';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Jučer';
    return date.toLocaleDateString('hr-HR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  async changeDate(date: string) {
    this.selectedDate = date;
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      const entry = await this.trackerService.getTrackerEntry('screentime', this.selectedDate);
      if (entry && entry.data) {
        this.appUsages = entry.data.appUsages || [];
        this.dailyLimit = entry.data.dailyLimit || 180;
      } else {
        this.appUsages = [];
        this.dailyLimit = 180;
      }
    } catch (error) {
      console.error('Error loading screen time data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('screentime');
      const weekly = await this.trackerService.getWeeklyStats('screentime');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      this.weeklyData = weekly.entries.map((d: any) => {
        const date = new Date(d.date);
        return {
          day: dayNames[date.getDay()],
          minutes: d.data?.totalMinutes || 0,
        };
      });
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  addUsage() {
    if (!this.newUsage.app || !this.newUsage.category) return;

    const usage: AppUsage = {
      id: Date.now().toString(),
      app: this.newUsage.app || '',
      category: this.newUsage.category || '',
      minutes: this.newUsage.minutes || 30,
    };

    this.appUsages.push(usage);
    this.newUsage = { app: '', category: '', minutes: 30 };
    this.saveData();
  }

  removeUsage(id: string) {
    this.appUsages = this.appUsages.filter((u) => u.id !== id);
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const totalMinutes = this.appUsages.reduce((sum, u) => sum + u.minutes, 0);
      const data = {
        appUsages: this.appUsages,
        dailyLimit: this.dailyLimit,
        totalMinutes,
      };
      await this.trackerService.saveTrackerEntry('screentime', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving screen time data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getTotalMinutes(): number {
    return this.appUsages.reduce((sum, u) => sum + u.minutes, 0);
  }

  getUsagePercentage(): number {
    if (this.dailyLimit <= 0) return 0;
    return Math.min(100, Math.round((this.getTotalMinutes() / this.dailyLimit) * 100));
  }

  getUsageColor(): string {
    const percentage = this.getUsagePercentage();
    if (percentage < 70) return '#00b894';
    if (percentage < 90) return '#fdcb6e';
    return '#e17055';
  }

  formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  getCategoryColor(category: string): string {
    const cat = this.categories.find((c) => c.value === category);
    return cat ? cat.color : '#636e72';
  }

  getCategoryLabel(category: string): string {
    const cat = this.categories.find((c) => c.value === category);
    return cat ? cat.label : category;
  }

  getCategoryBreakdown(): { category: string; minutes: number; percentage: number }[] {
    const total = this.getTotalMinutes();
    const breakdown: { [key: string]: number } = {};

    this.appUsages.forEach((u) => {
      breakdown[u.category] = (breakdown[u.category] || 0) + u.minutes;
    });

    return Object.entries(breakdown)
      .map(([category, minutes]) => ({
        category,
        minutes,
        percentage: total > 0 ? Math.round((minutes / total) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  getMaxWeeklyMinutes(): number {
    return Math.max(...this.weeklyData.map((d) => d.minutes), 1);
  }

  trackById(index: number, item: AppUsage): string {
    return item.id;
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
}
