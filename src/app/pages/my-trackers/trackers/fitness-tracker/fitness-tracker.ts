import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, FitnessEntry } from '../../../../services/tracker';

interface Exercise {
  id: string;
  name: string;
  type: string;
  duration: number;
  calories: number;
  completed: boolean;
}

@Component({
  selector: 'app-fitness-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './fitness-tracker.html',
  styleUrl: './fitness-tracker.css',
})
export class FitnessTracker implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  exercises: Exercise[] = [];
  newExercise: Partial<Exercise> = { name: '', type: '', duration: 15, calories: 0 };
  steps = 0;
  stepsGoal = 10000;

  streak = 0;
  weeklyProgress = 0;
  totalCalories = 0;
  totalMinutes = 0;

  exerciseTypes = [
    '🏃 Trčanje',
    '🚴 Bicikl',
    '🏊 Plivanje',
    '🧘 Yoga',
    '💪 Snaga',
    '🤸 Rastezanje',
    '⚽ Sport',
    '🚶 Hodanje',
    '🏋️ Teretana',
    '🎯 Ostalo',
  ];

  weeklyData: { day: string; minutes: number; calories: number }[] = [];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('fitness');
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
      const entry = await this.trackerService.getTrackerEntry('fitness', this.selectedDate);
      if (entry && entry.data) {
        this.exercises = entry.data.exercises || [];
        this.steps = entry.data.steps || 0;
        this.stepsGoal = entry.data.stepsGoal || 10000;
      } else {
        this.exercises = [];
        this.steps = 0;
        this.stepsGoal = 10000;
      }
      this.calculateTotals();
    } catch (error) {
      console.error('Error loading fitness data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('fitness');
      const weekly = await this.trackerService.getWeeklyStats('fitness');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      this.weeklyData = weekly.entries.map((d: any) => {
        const date = new Date(d.date);
        return {
          day: dayNames[date.getDay()],
          minutes: d.data?.totalMinutes || 0,
          calories: d.data?.totalCalories || 0,
        };
      });
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  calculateTotals() {
    const completed = this.exercises.filter((e) => e.completed);
    this.totalCalories = completed.reduce((sum, e) => sum + e.calories, 0);
    this.totalMinutes = completed.reduce((sum, e) => sum + e.duration, 0);
  }

  addExercise() {
    if (!this.newExercise.name || !this.newExercise.type) return;

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: this.newExercise.name || '',
      type: this.newExercise.type || '',
      duration: this.newExercise.duration || 15,
      calories: this.newExercise.calories || 0,
      completed: false,
    };

    this.exercises.push(exercise);
    this.newExercise = { name: '', type: '', duration: 15, calories: 0 };
    this.saveData();
  }

  toggleExercise(id: string) {
    const exercise = this.exercises.find((e) => e.id === id);
    if (exercise) {
      exercise.completed = !exercise.completed;
      this.calculateTotals();
      this.saveData();
    }
  }

  removeExercise(id: string) {
    this.exercises = this.exercises.filter((e) => e.id !== id);
    this.calculateTotals();
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const data = {
        exercises: this.exercises,
        steps: this.steps,
        stepsGoal: this.stepsGoal,
        totalMinutes: this.totalMinutes,
        totalCalories: this.totalCalories,
      };
      await this.trackerService.saveTrackerEntry('fitness', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving fitness data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getStepsPercentage(): number {
    if (this.stepsGoal <= 0) return 0;
    return Math.min(100, Math.round((this.steps / this.stepsGoal) * 100));
  }

  getMaxWeeklyValue(): number {
    const maxMins = Math.max(...this.weeklyData.map((d) => d.minutes), 1);
    return maxMins;
  }

  trackById(index: number, item: Exercise): string {
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
