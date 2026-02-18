import { Component, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TrackerService, TrackerConfig, FinanceEntry } from '../../../../services/tracker';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  time: string;
}

@Component({
  selector: 'app-finance-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './finance-tracker.html',
  styleUrl: './finance-tracker.css',
})
export class FinanceTracker implements OnInit {
  tracker: TrackerConfig | null = null;
  selectedDate: string = '';
  dateOptions: string[] = [];
  isLoading = true;
  isSaving = false;
  showDatePicker = false;

  transactions: Transaction[] = [];
  newTransaction: Partial<Transaction> = {
    type: 'expense',
    amount: 0,
    category: '',
    description: '',
  };
  dailyBudget: number = 0;

  streak = 0;
  weeklyProgress = 0;
  totalSpent = 0;
  totalIncome = 0;

  expenseCategories = [
    '🍔 Hrana',
    '🚌 Prijevoz',
    '📚 Škola',
    '🎮 Zabava',
    '👕 Odjeća',
    '💊 Zdravlje',
    '🎁 Pokloni',
    '📱 Tehnologija',
    '💡 Ostalo',
  ];
  incomeCategories = ['💰 Džeparac', '💼 Posao', '🎁 Poklon', '💵 Ostalo'];

  weeklyData: { day: string; spent: number; income: number }[] = [];

  constructor(private trackerService: TrackerService, private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    this.tracker = this.trackerService.getTrackerConfig('finance');
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
      const entry = await this.trackerService.getTrackerEntry('finance', this.selectedDate);
      if (entry && entry.data) {
        this.transactions = entry.data.transactions || [];
        this.dailyBudget = entry.data.dailyBudget || 0;
      } else {
        this.transactions = [];
        this.dailyBudget = 50;
      }
      this.calculateTotals();
    } catch (error) {
      console.error('Error loading finance data:', error);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async loadStats() {
    try {
      this.streak = await this.trackerService.getTrackerStreak('finance');
      const weekly = await this.trackerService.getWeeklyStats('finance');
      this.weeklyProgress = Math.round((weekly.completedDays / 7) * 100);

      const dayNames = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
      this.weeklyData = weekly.entries.map((d: any) => {
        const date = new Date(d.date);
        return {
          day: dayNames[date.getDay()],
          spent: d.data?.totalExpenses || 0,
          income: d.data?.totalIncome || 0,
        };
      });
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  calculateTotals() {
    this.totalSpent = this.transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    this.totalIncome = this.transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  addTransaction() {
    if (!this.newTransaction.amount || !this.newTransaction.category) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: this.newTransaction.type || 'expense',
      amount: this.newTransaction.amount || 0,
      category: this.newTransaction.category || '',
      description: this.newTransaction.description || '',
      time: new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }),
    };

    this.transactions.push(transaction);
    this.calculateTotals();
    this.newTransaction = { type: 'expense', amount: 0, category: '', description: '' };
    this.saveData();
  }

  removeTransaction(id: string) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.calculateTotals();
    this.saveData();
  }

  async saveData() {
    this.isSaving = true;
    try {
      const data = {
        transactions: this.transactions,
        dailyBudget: this.dailyBudget,
        totalExpenses: this.totalSpent,
        totalIncome: this.totalIncome,
      };
      await this.trackerService.saveTrackerEntry('finance', this.selectedDate, data);
      await this.loadStats();
    } catch (error) {
      console.error('Error saving finance data:', error);
    }
    this.isSaving = false;
    this.cdr.detectChanges();
  }

  getBudgetPercentage(): number {
    if (this.dailyBudget <= 0) return 0;
    return Math.min(100, Math.round((this.totalSpent / this.dailyBudget) * 100));
  }

  getBudgetColor(): string {
    const percentage = this.getBudgetPercentage();
    if (percentage < 50) return '#00b894';
    if (percentage < 80) return '#fdcb6e';
    return '#e17055';
  }

  getBalance(): number {
    return this.totalIncome - this.totalSpent;
  }

  getMaxWeeklyAmount(): number {
    const amounts = this.weeklyData.map((d) => Math.max(d.spent, d.income));
    return Math.max(...amounts, 1);
  }

  trackById(index: number, item: Transaction): string {
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
