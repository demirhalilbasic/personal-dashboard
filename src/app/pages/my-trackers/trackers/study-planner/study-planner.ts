import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, StudyEntry } from '../../../../services/tracker';

interface StudySession {
  id: string;
  subject: string;
  topic: string;
  duration: number;
  completed: boolean;
  notes: string;
}

@Component({
  selector: 'app-study-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './study-planner.html',
  styleUrl: './study-planner.css',
})
export class StudyPlanner implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  sessions: StudySession[] = [];
  newSession: Partial<StudySession> = { subject: '', topic: '', duration: 30, notes: '' };
  dailyGoalMinutes = 120;

  streak = 0;
  weeklyProgress = 0;
  totalMinutes = 0;

  subjects = [
    '� Web programiranje',
    '📊 Uvod u analizu podataka',
    '🎨 Web dizajn',
    '📢 Direktni marketing',
    '🏦 Elektronsko bankarstvo i platni promet',
    '🛒 Elektronska trgovina',
    '📈 Berzansko poslovanje',
    '🎧 Tehnologije i sistemi za podršku korisnicima',
    '📚 Ostalo',
  ];

  weeklyData: { day: string; minutes: number }[] = [];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('study');
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
      const entry = await this.trackerService.getTrackerEntry('study', this.selectedDate);
      if (entry && entry.data) {
        this.sessions = entry.data.sessions || [];
        this.dailyGoalMinutes = entry.data.dailyGoal || 120;
      } else {
        this.sessions = [];
        this.dailyGoalMinutes = 120;
      }
      this.calculateTotal();
    } catch (error) {
      console.error('Error loading study data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('study');
      const weekly = await this.trackerService.getWeeklyStats('study');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      this.weeklyData = weekly.entries.map((d: any) => {
        const date = new Date(d.date);
        return {
          day: dayNames[date.getDay()],
          minutes: d.data?.totalMinutes || 0,
        };
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  calculateTotal() {
    this.totalMinutes = this.sessions
      .filter((s) => s.completed)
      .reduce((sum, s) => sum + s.duration, 0);
  }

  addSession() {
    if (!this.newSession.subject || !this.newSession.duration) return;

    const session: StudySession = {
      id: Date.now().toString(),
      subject: this.newSession.subject || '',
      topic: this.newSession.topic || '',
      duration: this.newSession.duration || 30,
      completed: false,
      notes: this.newSession.notes || '',
    };

    this.sessions.push(session);
    this.newSession = { subject: '', topic: '', duration: 30, notes: '' };
    this.saveData();
  }

  toggleSession(id: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (session) {
      session.completed = !session.completed;
      this.calculateTotal();
      this.saveData();
    }
  }

  removeSession(id: string) {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.calculateTotal();
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const data = {
        sessions: this.sessions,
        dailyGoal: this.dailyGoalMinutes,
        totalMinutes: this.totalMinutes,
      };
      await this.trackerService.saveTrackerEntry('study', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving study data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getProgressPercentage(): number {
    if (this.dailyGoalMinutes <= 0) return 0;
    return Math.min(100, Math.round((this.totalMinutes / this.dailyGoalMinutes) * 100));
  }

  formatMinutes(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  getMaxWeeklyMinutes(): number {
    const maxMins = Math.max(...this.weeklyData.map((d) => d.minutes), 1);
    return maxMins;
  }

  trackById(index: number, item: StudySession): string {
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
