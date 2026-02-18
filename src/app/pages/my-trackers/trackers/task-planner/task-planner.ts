import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, TaskEntry } from '../../../../services/tracker';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  dueTime: string;
  completed: boolean;
}

@Component({
  selector: 'app-task-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './task-planner.html',
  styleUrl: './task-planner.css',
})
export class TaskPlanner implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  tasks: Task[] = [];
  newTask: Partial<Task> = { title: '', priority: 'medium', category: '', dueTime: '' };

  streak = 0;
  weeklyProgress = 0;

  categories = [
    '📚 Škola',
    '🏠 Kuća',
    '👥 Društveno',
    '💼 Projekti',
    '🎯 Osobno',
    '🛒 Kupovina',
    '📞 Pozivi',
    '💡 Ideje',
  ];
  priorities = [
    { value: 'high', label: '🔴 Visoki', color: '#e17055' },
    { value: 'medium', label: '🟡 Srednji', color: '#fdcb6e' },
    { value: 'low', label: '🟢 Niski', color: '#00b894' },
  ];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('task');
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
      const entry = await this.trackerService.getTrackerEntry('task', this.selectedDate);
      if (entry && entry.data) {
        this.tasks = entry.data.tasks || [];
      } else {
        this.tasks = [];
      }
    } catch (error) {
      console.error('Error loading task data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('task');
      const weekly = await this.trackerService.getWeeklyStats('task');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  addTask() {
    if (!this.newTask.title) return;

    const task: Task = {
      id: Date.now().toString(),
      title: this.newTask.title || '',
      description: this.newTask.description || '',
      priority: this.newTask.priority || 'medium',
      category: this.newTask.category || '🎯 Osobno',
      dueTime: this.newTask.dueTime || '',
      completed: false,
    };

    this.tasks.push(task);
    this.sortTasks();
    this.newTask = { title: '', priority: 'medium', category: '', dueTime: '' };
    this.saveData();
  }

  sortTasks() {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    this.tasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  toggleTask(id: string) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.completed = !task.completed;
      this.sortTasks();
      this.saveData();
    }
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const completedCount = this.tasks.filter((t) => t.completed).length;
      const data = {
        tasks: this.tasks,
        completedCount,
        totalCount: this.tasks.length,
      };
      await this.trackerService.saveTrackerEntry('task', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving task data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getCompletionPercentage(): number {
    if (this.tasks.length === 0) return 0;
    return Math.round((this.tasks.filter((t) => t.completed).length / this.tasks.length) * 100);
  }

  getCompletedTasksCount(): number {
    return this.tasks.filter((t) => t.completed).length;
  }

  getPriorityColor(priority: string): string {
    const p = this.priorities.find((pr) => pr.value === priority);
    return p ? p.color : '#636e72';
  }

  trackById(index: number, item: Task): string {
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
