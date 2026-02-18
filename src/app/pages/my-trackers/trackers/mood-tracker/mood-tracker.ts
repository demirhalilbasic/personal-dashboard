import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../services/theme';
import { TrackerService, TrackerConfig, MoodEntry } from '../../../../services/tracker';

interface MoodOption {
  value: number;
  emoji: string;
  label: string;
  color: string;
}

interface Emotion {
  name: string;
  emoji: string;
}

@Component({
  selector: 'app-mood-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './mood-tracker.html',
  styleUrls: ['./mood-tracker.css'],
})
export class MoodTrackerComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  tracker: TrackerConfig | null = null;

  selectedDate: string = new Date().toISOString().split('T')[0];
  mood: number = 3;
  energy: number = 3;
  stress: number = 3;
  selectedEmotions: string[] = [];
  notes: string = '';

  streak: number = 0;
  weeklyProgress: number = 0;
  monthlyProgress: number = 0;
  weeklyMoodData: { day: string; mood: number }[] = [];

  isLoading = true;
  isSaving = false;
  showDatePicker = false;
  dateOptions: string[] = [];

  moodOptions: MoodOption[] = [
    { value: 1, emoji: '😢', label: 'Loše', color: '#F44336' },
    { value: 2, emoji: '😕', label: 'Slabo', color: '#FF9800' },
    { value: 3, emoji: '😐', label: 'Ok', color: '#FFC107' },
    { value: 4, emoji: '🙂', label: 'Dobro', color: '#8BC34A' },
    { value: 5, emoji: '😄', label: 'Odlično', color: '#4CAF50' },
  ];

  emotions: Emotion[] = [
    { name: 'Sretan/na', emoji: '😊' },
    { name: 'Zahvalan/na', emoji: '🙏' },
    { name: 'Motiviran/a', emoji: '💪' },
    { name: 'Miran/na', emoji: '😌' },
    { name: 'Uzbuđen/a', emoji: '🤩' },
    { name: 'Ljubav', emoji: '❤️' },
    { name: 'Tužan/na', emoji: '😢' },
    { name: 'Ljut/a', emoji: '😠' },
    { name: 'Anksiozan/na', emoji: '😰' },
    { name: 'Umoran/na', emoji: '😴' },
    { name: 'Zbunjen/a', emoji: '😕' },
    { name: 'Nostalgičan/na', emoji: '🥹' },
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
    this.tracker = this.trackerService.getTrackerById('mood') || null;

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
      const entry = await this.trackerService.getTrackerEntry('mood', this.selectedDate);
      if (entry) {
        this.mood = entry.data.mood || 3;
        this.energy = entry.data.energy || 3;
        this.stress = entry.data.stress || 3;
        this.selectedEmotions = entry.data.emotions || [];
        this.notes = entry.data.notes || '';
      } else {
        this.mood = 3;
        this.energy = 3;
        this.stress = 3;
        this.selectedEmotions = [];
        this.notes = '';
      }
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error loading mood data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('mood');
      const weeklyStats = await this.trackerService.getWeeklyStats('mood');
      this.weeklyProgress = Math.round((weeklyStats.completedDays / weeklyStats.totalDays) * 100);
      const today = new Date();
      const monthlyStats = await this.trackerService.getMonthlyStats(
        'mood',
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
    this.weeklyMoodData = [];
    const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const entry = await this.trackerService.getTrackerEntry('mood', dateStr);

      this.weeklyMoodData.push({
        day: dayNames[date.getDay()],
        mood: entry?.data.mood || 0,
      });
    }
  }

  setMood(value: number) {
    this.mood = value;
  }

  setEnergy(value: number) {
    this.energy = value;
  }

  setStress(value: number) {
    this.stress = value;
  }

  toggleEmotion(emotionName: string) {
    const index = this.selectedEmotions.indexOf(emotionName);
    if (index > -1) {
      this.selectedEmotions.splice(index, 1);
    } else {
      this.selectedEmotions.push(emotionName);
    }
  }

  isEmotionSelected(emotionName: string): boolean {
    return this.selectedEmotions.includes(emotionName);
  }

  async saveData() {
    this.isSaving = true;
    try {
      await this.trackerService.saveTrackerEntry(
        'mood',
        this.selectedDate,
        {
          mood: this.mood,
          energy: this.energy,
          stress: this.stress,
          emotions: this.selectedEmotions,
          notes: this.notes,
        },
        true
      );
      await this.loadStats();
      await this.loadWeeklyData();
    } catch (error) {
      console.error('Error saving mood data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  async changeDate(newDate: string) {
    this.selectedDate = newDate;
    await this.loadData();
  }

  getMoodEmoji(value: number): string {
    const option = this.moodOptions.find((m) => m.value === value);
    return option?.emoji || '😐';
  }

  getMoodColor(value: number): string {
    const option = this.moodOptions.find((m) => m.value === value);
    return option?.color || '#FFC107';
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

  getAverageMood(): number {
    const validMoods = this.weeklyMoodData.filter((d) => d.mood > 0);
    if (validMoods.length === 0) return 0;
    return (
      Math.round((validMoods.reduce((sum, d) => sum + d.mood, 0) / validMoods.length) * 10) / 10
    );
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
