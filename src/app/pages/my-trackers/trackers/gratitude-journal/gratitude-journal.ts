import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { TrackerService, TrackerConfig } from '../../../../services/tracker';

@Component({
  selector: 'app-gratitude-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './gratitude-journal.html',
  styleUrls: ['./gratitude-journal.css'],
})
export class GratitudeJournalComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  tracker: TrackerConfig | null = null;

  selectedDate: string = new Date().toISOString().split('T')[0];
  gratitudes: string[] = ['', '', ''];
  highlight: string = '';
  affirmation: string = '';

  streak: number = 0;
  weeklyProgress: number = 0;
  totalEntries: number = 0;

  isLoading = true;
  isSaving = false;
  showDatePicker = false;
  dateOptions: string[] = [];

  affirmationSuggestions = [
    'Ja sam sposoban/na i jak/a.',
    'Zaslužujem sreću i uspjeh.',
    'Danas biram pozitivnost.',
    'Učim i rastem svaki dan.',
    'Ja sam dovoljno.',
    'Otvoren/a sam za nove mogućnosti.',
    'Imam sve što mi treba.',
    'Biram mir i radost.',
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
    this.tracker = this.trackerService.getTrackerById('gratitude') || null;
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
      const entry = await this.trackerService.getTrackerEntry('gratitude', this.selectedDate);
      if (entry) {
        this.gratitudes = entry.data.gratitudes || ['', '', ''];
        this.highlight = entry.data.highlight || '';
        this.affirmation = entry.data.affirmation || '';
      } else {
        this.gratitudes = ['', '', ''];
        this.highlight = '';
        this.affirmation = '';
      }
      await this.loadStats();
    } catch (error) {
      console.error('Error loading gratitude data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('gratitude');
      const weeklyStats = await this.trackerService.getWeeklyStats('gratitude');
      this.weeklyProgress = Math.round((weeklyStats.completedDays / weeklyStats.totalDays) * 100);
      const today = new Date();
      const monthlyStats = await this.trackerService.getMonthlyStats(
        'gratitude',
        today.getFullYear(),
        today.getMonth()
      );
      this.totalEntries = monthlyStats.completedDays;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  addGratitude() {
    this.gratitudes.push('');
  }

  removeGratitude(index: number) {
    if (this.gratitudes.length > 1) {
      this.gratitudes.splice(index, 1);
    }
  }

  useAffirmation(affirmation: string) {
    this.affirmation = affirmation;
  }

  async saveData() {
    this.isSaving = true;
    try {
      const filledGratitudes = this.gratitudes.filter((g) => g.trim());
      const isComplete = filledGratitudes.length >= 1;

      await this.trackerService.saveTrackerEntry(
        'gratitude',
        this.selectedDate,
        {
          gratitudes: this.gratitudes,
          highlight: this.highlight,
          affirmation: this.affirmation,
        },
        isComplete
      );
      await this.loadStats();
    } catch (error) {
      console.error('Error saving gratitude data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  async changeDate(newDate: string) {
    this.selectedDate = newDate;
    await this.loadData();
  }

  trackByIndex(index: number): number {
    return index;
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
