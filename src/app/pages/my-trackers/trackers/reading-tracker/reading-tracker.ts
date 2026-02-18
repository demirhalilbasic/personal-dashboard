import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, ReadingEntry } from '../../../../services/tracker';

@Component({
  selector: 'app-reading-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reading-tracker.html',
  styleUrl: './reading-tracker.css',
})
export class ReadingTracker implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  bookTitle = '';
  author = '';
  pagesRead = 0;
  currentPage = 0;
  totalPages = 0;
  minutesRead = 0;
  notes = '';
  rating = 0;

  dailyGoalPages = 20;
  dailyGoalMinutes = 30;

  streak = 0;
  weeklyProgress = 0;
  totalPagesThisWeek = 0;

  weeklyData: { day: string; pages: number }[] = [];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('reading');
    this.generateDateOptions();
    this.selectedDate = this.dateOptions[0];
    this.loadData();
    this.loadStats();
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
      const entry = await this.trackerService.getTrackerEntry('reading', this.selectedDate);
      if (entry && entry.data) {
        this.bookTitle = entry.data.bookTitle || '';
        this.author = entry.data.author || '';
        this.pagesRead = entry.data.pagesRead || 0;
        this.currentPage = entry.data.currentPage || 0;
        this.totalPages = entry.data.totalPages || 0;
        this.minutesRead = entry.data.minutesRead || 0;
        this.notes = entry.data.notes || '';
        this.rating = entry.data.rating || 0;
        this.dailyGoalPages = entry.data.dailyGoalPages || 20;
        this.dailyGoalMinutes = entry.data.dailyGoalMinutes || 30;
      } else {
        this.resetForm();
      }
    } catch (error) {
      console.error('Error loading reading data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  resetForm() {
    this.pagesRead = 0;
    this.minutesRead = 0;
    this.notes = '';
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('reading');
      const weekly = await this.trackerService.getWeeklyStats('reading');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      this.weeklyData = weekly.entries.map((d: any) => {
        const date = new Date(d.date);
        return {
          day: dayNames[date.getDay()],
          pages: d.data?.pagesRead || 0,
        };
      });

      this.totalPagesThisWeek = this.weeklyData.reduce((sum, d) => sum + d.pages, 0);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async saveData() {
    this.isSaving = true;
    try {
      const data = {
        bookTitle: this.bookTitle,
        author: this.author,
        pagesRead: this.pagesRead,
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        minutesRead: this.minutesRead,
        notes: this.notes,
        rating: this.rating,
        dailyGoalPages: this.dailyGoalPages,
        dailyGoalMinutes: this.dailyGoalMinutes,
      };
      await this.trackerService.saveTrackerEntry('reading', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving reading data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getProgressPercentage(): number {
    if (this.totalPages <= 0) return 0;
    return Math.min(100, Math.round((this.currentPage / this.totalPages) * 100));
  }

  getPagesGoalPercentage(): number {
    if (this.dailyGoalPages <= 0) return 0;
    return Math.min(100, Math.round((this.pagesRead / this.dailyGoalPages) * 100));
  }

  getMaxWeeklyPages(): number {
    return Math.max(...this.weeklyData.map((d) => d.pages), 1);
  }

  setRating(value: number) {
    this.rating = value;
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
