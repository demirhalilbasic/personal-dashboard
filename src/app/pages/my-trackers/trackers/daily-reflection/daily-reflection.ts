import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, ReflectionEntry } from '../../../../services/tracker';

@Component({
  selector: 'app-daily-reflection',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './daily-reflection.html',
  styleUrl: './daily-reflection.css',
})
export class DailyReflection implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  wins: string[] = ['', '', ''];
  challenges: string = '';
  lessons: string = '';
  tomorrowGoals: string[] = ['', '', ''];
  overallRating: number = 3;

  streak = 0;
  weeklyProgress = 0;
  totalEntries = 0;

  ratingLabels = ['😢 Loš', '😕 Okej', '🙂 Dobar', '😊 Odličan', '🤩 Fantastičan'];

  reflectionPrompts = [
    'Što me je danas usrećilo?',
    'Kako sam danas pomogao/la nekome?',
    'Što sam naučio/la iz današnjih izazova?',
    'Za što sam zahvalan/na?',
    'Kako mogu sutra biti bolji/a?',
  ];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('reflection');
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
      const entry = await this.trackerService.getTrackerEntry('reflection', this.selectedDate);
      if (entry && entry.data) {
        this.wins = entry.data.accomplishments || ['', '', ''];
        this.challenges = entry.data.challenges?.join('\n') || '';
        this.lessons = entry.data.learned || '';
        this.tomorrowGoals = entry.data.tomorrowGoals || ['', '', ''];
        this.overallRating = entry.data.overallRating || 3;
      } else {
        this.wins = ['', '', ''];
        this.challenges = '';
        this.lessons = '';
        this.tomorrowGoals = ['', '', ''];
        this.overallRating = 3;
      }
    } catch (error) {
      console.error('Error loading reflection data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('reflection');
      const weekly = await this.trackerService.getWeeklyStats('reflection');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const now = new Date();
      const monthly = await this.trackerService.getMonthlyStats(
        'reflection',
        now.getFullYear(),
        now.getMonth()
      );
      this.totalEntries = monthly.completedDays;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  addWin() {
    this.wins.push('');
  }

  removeWin(index: number) {
    if (this.wins.length > 1) {
      this.wins.splice(index, 1);
    }
  }

  addGoal() {
    this.tomorrowGoals.push('');
  }

  removeGoal(index: number) {
    if (this.tomorrowGoals.length > 1) {
      this.tomorrowGoals.splice(index, 1);
    }
  }

  setRating(rating: number) {
    this.overallRating = rating;
  }

  async saveData() {
    this.isSaving = true;
    try {
      const data = {
        accomplishments: this.wins.filter((w) => w.trim()),
        challenges: this.challenges.split('\n').filter((c) => c.trim()),
        learned: this.lessons,
        tomorrowGoals: this.tomorrowGoals.filter((g) => g.trim()),
        overallRating: this.overallRating,
      };
      await this.trackerService.saveTrackerEntry('reflection', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving reflection data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getRandomPrompt(): string {
    return this.reflectionPrompts[Math.floor(Math.random() * this.reflectionPrompts.length)];
  }

  trackByIndex(index: number): number {
    return index;
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
