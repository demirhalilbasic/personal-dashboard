import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';
import { FunZoneService, KanbanStats, KanbanTask } from '../../../../services/funzone';

@Component({
  selector: 'app-kanban',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './kanban.html',
  styleUrls: ['./kanban.css'],
})
export class KanbanComponent implements OnInit {
  showTaskModal = false;
  showClearModal = false;
  taskInput = '';
  nextId = 1;
  currentTheme: any;
  private isBrowser: boolean;

  tasks: KanbanTask[] = [];
  draggedTask: KanbanTask | null = null;

  // Statistics
  stats: KanbanStats | null = null;
  showStatsPanel = false;
  isSaving = false;
  saveMessage = '';

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private funZoneService: FunZoneService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  async ngOnInit() {
    this.applyTheme();
    if (this.isBrowser) {
      await this.loadStats();
      await this.loadTasks();
    }
  }

  async loadTasks() {
    try {
      const savedTasks = await this.funZoneService.loadKanbanTasks();
      if (savedTasks.length > 0) {
        this.tasks = savedTasks;
        this.nextId = Math.max(...savedTasks.map((t) => t.id)) + 1;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  private applyTheme() {
    if (!this.isBrowser || !this.currentTheme) return;

    // Apply CSS variables for theme colors
    const root = document.documentElement;
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    // Apply background gradient
    document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }

  async loadStats() {
    try {
      this.stats = await this.funZoneService.getKanbanStats();
    } catch (error) {
      console.error('Error loading kanban stats:', error);
    }
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  getTasks(status: 'todo' | 'progress' | 'done'): KanbanTask[] {
    return this.tasks.filter((t) => t.status === status);
  }

  openAddTask() {
    this.showTaskModal = true;
    this.taskInput = '';
  }

  async addTask() {
    if (!this.taskInput.trim()) return;

    this.tasks.push({
      id: this.nextId++,
      text: this.taskInput.trim(),
      status: 'todo',
    });

    this.showTaskModal = false;
    this.taskInput = '';

    // Track task created
    try {
      await this.funZoneService.updateKanbanTaskCreated();
      await this.loadStats();
    } catch (error) {
      console.error('Error tracking task:', error);
    }
  }

  cancelAdd() {
    this.showTaskModal = false;
    this.taskInput = '';
  }

  openClearBoard() {
    this.showClearModal = true;
  }

  async clearBoard() {
    this.tasks = [];
    this.showClearModal = false;

    // Also clear from database
    try {
      await this.funZoneService.saveKanbanTasks([]);
    } catch (error) {
      console.error('Error clearing tasks from database:', error);
    }
  }

  cancelClear() {
    this.showClearModal = false;
  }

  onDragStart(task: KanbanTask) {
    this.draggedTask = task;
  }

  onDragEnd() {
    this.draggedTask = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async onDrop(status: 'todo' | 'progress' | 'done') {
    if (this.draggedTask) {
      const wasCompleted = this.draggedTask.status !== 'done' && status === 'done';
      this.draggedTask.status = status;

      // Track task completion
      if (wasCompleted) {
        try {
          await this.funZoneService.updateKanbanTaskCompleted();
          await this.loadStats();
        } catch (error) {
          console.error('Error tracking completion:', error);
        }
      }
    }
  }

  async saveBoard() {
    if (this.tasks.length === 0) {
      this.saveMessage = 'Nema taskova za spremiti!';
      setTimeout(() => (this.saveMessage = ''), 3000);
      return;
    }

    this.isSaving = true;
    this.saveMessage = '';
    this.cdr.detectChanges();

    try {
      await this.funZoneService.saveKanbanTasks(this.tasks);
      this.isSaving = false;
      this.saveMessage = '✅ Taskovi su uspješno spremljeni!';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.saveMessage = '';
        this.cdr.detectChanges();
      }, 3000);
    } catch (error) {
      console.error('Error saving tasks:', error);
      this.isSaving = false;
      this.saveMessage = '❌ Greška pri spremanju taskova';
      this.cdr.detectChanges();
      setTimeout(() => {
        this.saveMessage = '';
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
