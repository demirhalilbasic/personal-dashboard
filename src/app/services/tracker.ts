import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

// Tracker type definitions
export interface TrackerConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  category: 'health' | 'productivity' | 'wellness' | 'finance' | 'personal';
}

export interface TrackerEntry {
  id?: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  data: any;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserTrackerSettings {
  enabledTrackers: string[];
  reminderTime?: string;
  weekStartsOn: 'sunday' | 'monday';
}

export interface DayStatus {
  date: string;
  totalTrackers: number;
  completedTrackers: number;
  status: 'all' | 'partial' | 'none';
}

// Habit Tracker specific
export interface HabitEntry extends TrackerEntry {
  data: {
    habits: { name: string; completed: boolean; streak: number }[];
  };
}

// Sleep Tracker specific
export interface SleepEntry extends TrackerEntry {
  data: {
    bedTime: string;
    wakeTime: string;
    quality: number; // 1-5
    notes: string;
    hoursSlept: number;
  };
}

// Study Planner specific
export interface StudyEntry extends TrackerEntry {
  data: {
    subject: string;
    duration: number; // minutes
    topics: string[];
    productivity: number; // 1-5
    notes: string;
  };
}

// Fitness Tracker specific
export interface FitnessEntry extends TrackerEntry {
  data: {
    workoutType: string;
    duration: number; // minutes
    calories: number;
    exercises: { name: string; sets: number; reps: number }[];
    notes: string;
  };
}

// Task Planner specific
export interface TaskEntry extends TrackerEntry {
  data: {
    tasks: {
      title: string;
      priority: 'low' | 'medium' | 'high';
      completed: boolean;
      dueTime?: string;
    }[];
    completionRate: number;
  };
}

// Meal Planner specific
export interface MealEntry extends TrackerEntry {
  data: {
    meals: {
      type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      description: string;
      calories?: number;
      healthy: boolean;
    }[];
    waterIntake: number; // glasses
    notes: string;
  };
}

// Mood Tracker specific
export interface MoodEntry extends TrackerEntry {
  data: {
    mood: number; // 1-5 (very bad to very good)
    energy: number; // 1-5
    stress: number; // 1-5
    emotions: string[];
    notes: string;
  };
}

// Finance Tracker specific
export interface FinanceEntry extends TrackerEntry {
  data: {
    transactions: {
      type: 'income' | 'expense';
      category: string;
      amount: number;
      description: string;
    }[];
    dailyBudget: number;
    spent: number;
    saved: number;
  };
}

// Gratitude Journal specific
export interface GratitudeEntry extends TrackerEntry {
  data: {
    gratitudes: string[];
    highlight: string;
    affirmation: string;
  };
}

// Daily Reflection specific
export interface ReflectionEntry extends TrackerEntry {
  data: {
    accomplishments: string[];
    challenges: string[];
    learned: string;
    tomorrowGoals: string[];
    overallRating: number; // 1-5
  };
}

// Water Intake specific
export interface WaterEntry extends TrackerEntry {
  data: {
    glasses: number;
    goal: number;
    times: string[]; // timestamps when water was consumed
  };
}

// Reading Tracker specific
export interface ReadingEntry extends TrackerEntry {
  data: {
    bookTitle: string;
    pagesRead: number;
    minutesRead: number;
    notes: string;
    finished: boolean;
  };
}

// Screen Time specific
export interface ScreenTimeEntry extends TrackerEntry {
  data: {
    totalMinutes: number;
    productiveMinutes: number;
    socialMediaMinutes: number;
    categories: { name: string; minutes: number }[];
    goal: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TrackerService {
  private userSettings = signal<UserTrackerSettings | null>(null);

  readonly availableTrackers: TrackerConfig[] = [
    {
      id: 'habit',
      name: 'Habit Tracker',
      icon: '✅',
      description: 'Pratite svoje dnevne navike i gradite streak',
      color: '#4CAF50',
      category: 'personal',
    },
    {
      id: 'sleep',
      name: 'Sleep Tracker',
      icon: '😴',
      description: 'Pratite kvalitetu i trajanje sna',
      color: '#9C27B0',
      category: 'health',
    },
    {
      id: 'study',
      name: 'Study Planner',
      icon: '📚',
      description: 'Planirajte i pratite vrijeme učenja',
      color: '#2196F3',
      category: 'productivity',
    },
    {
      id: 'fitness',
      name: 'Fitness Tracker',
      icon: '💪',
      description: 'Pratite vježbanje i fizičku aktivnost',
      color: '#FF5722',
      category: 'health',
    },
    {
      id: 'task',
      name: 'Task Planner',
      icon: '📋',
      description: 'Organizirajte dnevne zadatke',
      color: '#3F51B5',
      category: 'productivity',
    },
    {
      id: 'meal',
      name: 'Meal Planner',
      icon: '🍽️',
      description: 'Pratite prehranu i obroke',
      color: '#FF9800',
      category: 'health',
    },
    {
      id: 'mood',
      name: 'Mood Tracker',
      icon: '😊',
      description: 'Pratite raspoloženje i emocije',
      color: '#E91E63',
      category: 'wellness',
    },
    {
      id: 'finance',
      name: 'Finance Tracker',
      icon: '💰',
      description: 'Pratite prihode i rashode',
      color: '#4CAF50',
      category: 'finance',
    },
    {
      id: 'gratitude',
      name: 'Gratitude Journal',
      icon: '🙏',
      description: 'Zapisujte za što ste zahvalni',
      color: '#FFC107',
      category: 'wellness',
    },
    {
      id: 'reflection',
      name: 'Daily Reflection',
      icon: '💭',
      description: 'Reflektirajte o danu',
      color: '#607D8B',
      category: 'personal',
    },
    {
      id: 'water',
      name: 'Water Intake',
      icon: '💧',
      description: 'Pratite unos vode',
      color: '#00BCD4',
      category: 'health',
    },
    {
      id: 'reading',
      name: 'Reading Tracker',
      icon: '📖',
      description: 'Pratite čitanje knjiga',
      color: '#795548',
      category: 'personal',
    },
    {
      id: 'screentime',
      name: 'Screen Time',
      icon: '📱',
      description: 'Pratite vrijeme ispred ekrana',
      color: '#9E9E9E',
      category: 'wellness',
    },
  ];

  // Event emitter for tracker entry changes (for real-time calendar updates)
  private trackerEntryChanged = new Subject<{ date: string; trackerId: string }>();
  public trackerEntryChanged$ = this.trackerEntryChanged.asObservable();

  constructor(private authService: AuthService) {}

  // Helper to get local date string in YYYY-MM-DD format
  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get user tracker settings
  async getUserSettings(): Promise<UserTrackerSettings> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const settingsRef = doc(db, 'users', user.uid, 'trackerSettings', 'config');
    const settingsDoc = await getDoc(settingsRef);

    if (settingsDoc.exists()) {
      const settings = settingsDoc.data() as UserTrackerSettings;
      this.userSettings.set(settings);
      return settings;
    }

    // Return default settings if none exist
    const defaultSettings: UserTrackerSettings = {
      enabledTrackers: ['habit', 'mood', 'water'],
      weekStartsOn: 'monday',
    };
    await this.saveUserSettings(defaultSettings);
    return defaultSettings;
  }

  // Save user tracker settings
  async saveUserSettings(settings: UserTrackerSettings): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const settingsRef = doc(db, 'users', user.uid, 'trackerSettings', 'config');
    await setDoc(settingsRef, settings);
    this.userSettings.set(settings);
  }

  // Get enabled trackers
  getEnabledTrackers(): TrackerConfig[] {
    const settings = this.userSettings();
    if (!settings) return [];
    return this.availableTrackers.filter((t) => settings.enabledTrackers.includes(t.id));
  }

  // Save tracker entry
  async saveTrackerEntry(
    trackerId: string,
    date: string,
    data: any,
    completed: boolean = true
  ): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const entryRef = doc(db, 'users', user.uid, 'trackers', trackerId, 'entries', date);
    const entry: TrackerEntry = {
      date,
      completed,
      data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const existingDoc = await getDoc(entryRef);
    if (existingDoc.exists()) {
      entry.createdAt = existingDoc.data()['createdAt'];
    }

    await setDoc(entryRef, entry);

    // Invalidate calendar cache for this month
    const [year, month] = date.split('-').map(Number);
    await this.invalidateCalendarCache(year, month - 1);

    // Emit event for real-time calendar updates
    this.trackerEntryChanged.next({ date, trackerId });
  }

  // Get tracker entry for a specific date
  async getTrackerEntry(trackerId: string, date: string): Promise<TrackerEntry | null> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const entryRef = doc(db, 'users', user.uid, 'trackers', trackerId, 'entries', date);
    const entryDoc = await getDoc(entryRef);

    if (entryDoc.exists()) {
      return entryDoc.data() as TrackerEntry;
    }
    return null;
  }

  // Get tracker entries for a date range
  async getTrackerEntriesRange(
    trackerId: string,
    startDate: string,
    endDate: string
  ): Promise<TrackerEntry[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const entriesRef = collection(db, 'users', user.uid, 'trackers', trackerId, 'entries');
    const q = query(
      entriesRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TrackerEntry));
  }

  // Get all tracker entries for a specific date (across all trackers)
  async getAllTrackersForDate(date: string): Promise<Map<string, TrackerEntry>> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const settings = await this.getUserSettings();
    const entries = new Map<string, TrackerEntry>();

    for (const trackerId of settings.enabledTrackers) {
      const entry = await this.getTrackerEntry(trackerId, date);
      if (entry) {
        entries.set(trackerId, entry);
      }
    }

    return entries;
  }

  // Get day status for calendar
  async getDayStatus(date: string): Promise<DayStatus> {
    const settings = await this.getUserSettings();
    const entries = await this.getAllTrackersForDate(date);

    const totalTrackers = settings.enabledTrackers.length;
    const completedTrackers = Array.from(entries.values()).filter((e) => e.completed).length;

    let status: 'all' | 'partial' | 'none' = 'none';
    if (completedTrackers === totalTrackers && totalTrackers > 0) {
      status = 'all';
    } else if (completedTrackers > 0) {
      status = 'partial';
    }

    return {
      date,
      totalTrackers,
      completedTrackers,
      status,
    };
  }

  // Get calendar data for a month
  async getMonthCalendarData(year: number, month: number): Promise<DayStatus[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const settings = await this.getUserSettings();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const statuses: DayStatus[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = await this.getDayStatus(date);
      statuses.push(status);
    }

    return statuses;
  }

  // Get streak for a tracker
  async getTrackerStreak(trackerId: string): Promise<number> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = this.getLocalDateString(currentDate);
      const entry = await this.getTrackerEntry(trackerId, dateStr);

      if (entry && entry.completed) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  // Get weekly stats for a tracker
  async getWeeklyStats(
    trackerId: string
  ): Promise<{ completedDays: number; totalDays: number; entries: TrackerEntry[] }> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const startDate = this.getLocalDateString(weekAgo);
    const endDate = this.getLocalDateString(today);

    const entries = await this.getTrackerEntriesRange(trackerId, startDate, endDate);
    const completedDays = entries.filter((e) => e.completed).length;

    return {
      completedDays,
      totalDays: 7,
      entries,
    };
  }

  // Get monthly stats
  async getMonthlyStats(
    trackerId: string,
    year: number,
    month: number
  ): Promise<{ completedDays: number; totalDays: number; entries: TrackerEntry[] }> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    const entries = await this.getTrackerEntriesRange(trackerId, startDate, endDate);
    const completedDays = entries.filter((e) => e.completed).length;

    // Calculate total days (up to today if current month)
    const today = new Date();
    let totalDays = lastDay;
    if (year === today.getFullYear() && month === today.getMonth()) {
      totalDays = today.getDate();
    }

    return {
      completedDays,
      totalDays,
      entries,
    };
  }

  // Delete tracker entry
  async deleteTrackerEntry(trackerId: string, date: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const entryRef = doc(db, 'users', user.uid, 'trackers', trackerId, 'entries', date);
    await deleteDoc(entryRef);
  }

  // Check if all trackers are completed for today
  async areAllTrackersCompleted(): Promise<boolean> {
    const today = this.getLocalDateString(new Date());
    const status = await this.getDayStatus(today);
    return status.status === 'all';
  }

  // Get today's completion percentage
  async getTodayCompletionPercentage(): Promise<number> {
    const today = this.getLocalDateString(new Date());
    const status = await this.getDayStatus(today);
    if (status.totalTrackers === 0) return 100;
    return Math.round((status.completedTrackers / status.totalTrackers) * 100);
  }

  // Helper to format date for display
  formatDate(date: string): string {
    const d = new Date(date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return d.toLocaleDateString('hr-HR', options);
  }

  // Get tracker by ID
  getTrackerById(id: string): TrackerConfig | null {
    return this.availableTrackers.find((t) => t.id === id) || null;
  }

  // Alias for getTrackerById (for compatibility)
  getTrackerConfig(id: string): TrackerConfig | null {
    return this.getTrackerById(id);
  }

  // Get weekly entries as array
  async getWeeklyEntriesArray(trackerId: string): Promise<TrackerEntry[]> {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const startDate = this.getLocalDateString(weekAgo);
    const endDate = this.getLocalDateString(today);

    return await this.getTrackerEntriesRange(trackerId, startDate, endDate);
  }

  // Get month calendar data from cache (or generate if not cached)
  async getMonthCalendarCache(year: number, month: number): Promise<DayStatus[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const cacheRef = doc(db, 'users', user.uid, 'calendarCache', monthKey);

    try {
      const cacheDoc = await getDoc(cacheRef);

      if (cacheDoc.exists()) {
        const data = cacheDoc.data();
        const cachedAt = data['cachedAt'] as Timestamp;
        const now = Timestamp.now();

        // Cache is valid for 5 minutes, or if it's not the current month (historical data doesn't change)
        const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();
        const cacheAgeMinutes = (now.seconds - cachedAt.seconds) / 60;

        if (!isCurrentMonth || cacheAgeMinutes < 5) {
          return data['statuses'] as DayStatus[];
        }
      }
    } catch (e) {
      // Cache doesn't exist or error reading, generate fresh
    }

    // Generate fresh data
    const statuses = await this.generateMonthStatuses(year, month);

    // Save to cache
    try {
      await setDoc(cacheRef, {
        monthKey,
        statuses,
        cachedAt: Timestamp.now(),
      });
    } catch (e) {
      // Ignore cache write errors
    }

    return statuses;
  }

  // Generate month statuses (batch load for better performance)
  private async generateMonthStatuses(year: number, month: number): Promise<DayStatus[]> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const settings = await this.getUserSettings();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const statuses: DayStatus[] = [];

    // Load all tracker entries for the month in parallel
    const trackerEntriesMap = new Map<string, Map<string, TrackerEntry>>();

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(
      2,
      '0'
    )}`;

    // Load entries for all enabled trackers in parallel
    const loadPromises = settings.enabledTrackers.map(async (trackerId) => {
      const entries = await this.getTrackerEntriesRange(trackerId, startDate, endDate);
      const entryMap = new Map<string, TrackerEntry>();
      entries.forEach((entry) => entryMap.set(entry.date, entry));
      trackerEntriesMap.set(trackerId, entryMap);
    });

    await Promise.all(loadPromises);

    // Now build statuses for each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      let completedTrackers = 0;
      for (const trackerId of settings.enabledTrackers) {
        const entryMap = trackerEntriesMap.get(trackerId);
        const entry = entryMap?.get(date);
        if (entry?.completed) {
          completedTrackers++;
        }
      }

      const totalTrackers = settings.enabledTrackers.length;
      let status: 'all' | 'partial' | 'none' = 'none';
      if (completedTrackers === totalTrackers && totalTrackers > 0) {
        status = 'all';
      } else if (completedTrackers > 0) {
        status = 'partial';
      }

      statuses.push({
        date,
        totalTrackers,
        completedTrackers,
        status,
      });
    }

    return statuses;
  }

  // Invalidate calendar cache for a specific month (call when tracker entry is saved)
  async invalidateCalendarCache(year: number, month: number): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const cacheRef = doc(db, 'users', user.uid, 'calendarCache', monthKey);

    try {
      await deleteDoc(cacheRef);
    } catch (e) {
      // Ignore delete errors
    }
  }
}
