import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, MealEntry } from '../../../../services/tracker';

interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  time: string;
  notes: string;
}

@Component({
  selector: 'app-meal-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './meal-planner.html',
  styleUrl: './meal-planner.css',
})
export class MealPlanner implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  meals: Meal[] = [];
  newMeal: Partial<Meal> = { type: 'breakfast', name: '', calories: 0, time: '', notes: '' };
  calorieGoal = 2000;
  waterGlasses = 0;

  streak = 0;
  weeklyProgress = 0;

  mealTypes = [
    { value: 'breakfast', label: '🌅 Doručak', icon: '🥣' },
    { value: 'lunch', label: '☀️ Ručak', icon: '🍽️' },
    { value: 'dinner', label: '🌙 Večera', icon: '🍲' },
    { value: 'snack', label: '🍎 Užina', icon: '🍪' },
  ];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('meal');
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
      const entry = await this.trackerService.getTrackerEntry('meal', this.selectedDate);
      if (entry && entry.data) {
        this.meals = entry.data.meals || [];
        this.calorieGoal = entry.data.calorieGoal || 2000;
        this.waterGlasses = entry.data.waterGlasses || 0;
      } else {
        this.meals = [];
        this.calorieGoal = 2000;
        this.waterGlasses = 0;
      }
    } catch (error) {
      console.error('Error loading meal data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('meal');
      const weekly = await this.trackerService.getWeeklyStats('meal');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  addMeal() {
    if (!this.newMeal.name) return;

    const meal: Meal = {
      id: Date.now().toString(),
      type: this.newMeal.type || 'breakfast',
      name: this.newMeal.name || '',
      calories: this.newMeal.calories || 0,
      time:
        this.newMeal.time ||
        new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }),
      notes: this.newMeal.notes || '',
    };

    this.meals.push(meal);
    this.newMeal = { type: 'breakfast', name: '', calories: 0, time: '', notes: '' };
    this.saveData();
  }

  removeMeal(id: string) {
    this.meals = this.meals.filter((m) => m.id !== id);
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const totalCalories = this.meals.reduce((sum, m) => sum + m.calories, 0);
      const data = {
        meals: this.meals,
        calorieGoal: this.calorieGoal,
        totalCalories,
        waterGlasses: this.waterGlasses,
      };
      await this.trackerService.saveTrackerEntry('meal', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving meal data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getTotalCalories(): number {
    return this.meals.reduce((sum, m) => sum + m.calories, 0);
  }

  getCaloriePercentage(): number {
    if (this.calorieGoal <= 0) return 0;
    return Math.min(100, Math.round((this.getTotalCalories() / this.calorieGoal) * 100));
  }

  getMealIcon(type: string): string {
    const mealType = this.mealTypes.find((m) => m.value === type);
    return mealType ? mealType.icon : '🍽️';
  }

  getMealsByType(type: string): Meal[] {
    return this.meals.filter((m) => m.type === type);
  }

  trackById(index: number, item: Meal): string {
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
