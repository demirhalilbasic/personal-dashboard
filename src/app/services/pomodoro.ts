import { Injectable, signal } from '@angular/core';
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { db, auth } from '../firebase.config';

export interface PomodoroSession {
  id: string;
  subject: string;
  sessionDuration: number; // in minutes
  breakDuration: number; // in minutes
  state: 'idle' | 'countdown' | 'focus' | 'break' | 'finished' | 'paused';
  remainingSeconds: number;
  startedAt: Timestamp | null;
  pausedAt: Timestamp | null;
  totalFocusTime: number; // accumulated focus seconds
  completedSessions: number;
}

export interface PomodoroStats {
  totalSessions: number;
  totalFocusMinutes: number;
  bySubject: Record<string, { sessions: number; minutes: number }>;
}

@Injectable({
  providedIn: 'root',
})
export class PomodoroService {
  private session = signal<PomodoroSession | null>(null);
  private timerInterval: any = null;
  private countdownInterval: any = null;
  private authUnsub: Unsubscribe | null = null;

  // Available subjects for students
  readonly subjects = [
    'Web programiranje',
    'Uvod u analizu podataka',
    'Web dizajn',
    'Direktni marketing',
    'Elektronsko bankarstvo i platni promet',
    'Elektronska trgovina',
    'Berzansko poslovanje',
    'Tehnologije i sistemi za podršku korisnicima',
    'Ostalo',
  ];

  // Default durations
  readonly defaultSessionDuration = 25; // minutes
  readonly defaultBreakDuration = 5; // minutes
  readonly countdownDuration = 5; // seconds

  constructor() {
    // React to auth changes to keep session isolated per account
    if (typeof window !== 'undefined') {
      this.authUnsub = onAuthStateChanged(auth, (user) => {
        // Always reset local state when account switches
        this.stopTimer();
        this.session.set(null);

        if (user) {
          // Load session for the newly signed-in user
          this.loadSession();
        }
      });

      // Initial load for current user if already signed in
      if (auth.currentUser) {
        this.loadSession();
      }
    }
  }

  getSession() {
    return this.session();
  }

  getSessionSignal() {
    return this.session;
  }

  async loadSession(): Promise<PomodoroSession | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      const docRef = doc(db, 'users', user.uid, 'pomodoro', 'current');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as PomodoroSession;

        // If session was in focus or break state, calculate elapsed time
        if ((data.state === 'focus' || data.state === 'break') && data.startedAt) {
          const now = Date.now();
          const startTime = data.startedAt.toMillis();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);

          // Calculate new remaining time
          let targetDuration =
            data.state === 'focus' ? data.sessionDuration * 60 : data.breakDuration * 60;

          const newRemaining = targetDuration - elapsedSeconds;

          if (newRemaining <= 0) {
            // Session/break ended while away
            if (data.state === 'focus') {
              data.state = 'break';
              data.remainingSeconds = data.breakDuration * 60;
              data.completedSessions += 1;
              data.totalFocusTime += data.sessionDuration * 60;
              await this.flushStats(data); // persist completed focus even if user was away
            } else {
              data.state = 'finished';
              data.remainingSeconds = 0;
            }
          } else {
            data.remainingSeconds = newRemaining;
            // Update totalFocusTime to reflect elapsed time during focus
            if (data.state === 'focus') {
              data.totalFocusTime += elapsedSeconds;
            }
          }
        }

        this.session.set(data);

        // Resume timer if needed
        if (data.state === 'focus' || data.state === 'break') {
          this.startTimer();
        }

        return data;
      }
      return null;
    } catch (error) {
      console.error('Error loading pomodoro session:', error);
      return null;
    }
  }

  async saveSession(): Promise<void> {
    const user = auth.currentUser;
    const currentSession = this.session();
    if (!user || !currentSession) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'pomodoro', 'current');
      await setDoc(docRef, currentSession);
    } catch (error) {
      console.error('Error saving pomodoro session:', error);
    }
  }

  async clearSession(): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const docRef = doc(db, 'users', user.uid, 'pomodoro', 'current');
      await deleteDoc(docRef);
      this.session.set(null);
      this.stopTimer();
    } catch (error) {
      console.error('Error clearing pomodoro session:', error);
    }
  }

  async startNewSession(
    subject: string,
    sessionDuration: number = 25,
    breakDuration: number = 5
  ): Promise<void> {
    this.stopTimer();

    const newSession: PomodoroSession = {
      id: `pomodoro_${Date.now()}`,
      subject,
      sessionDuration,
      breakDuration,
      state: 'countdown',
      remainingSeconds: this.countdownDuration,
      startedAt: null,
      pausedAt: null,
      totalFocusTime: 0,
      completedSessions: 0,
    };

    this.session.set(newSession);
    await this.saveSession();

    // Start 5 second countdown
    this.startCountdown();
  }

  private startCountdown(): void {
    this.stopTimer();

    this.countdownInterval = setInterval(async () => {
      const current = this.session();
      if (!current) {
        this.stopTimer();
        return;
      }

      if (current.remainingSeconds <= 1) {
        // Countdown finished, start focus session
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;

        const updated: PomodoroSession = {
          ...current,
          state: 'focus',
          remainingSeconds: current.sessionDuration * 60,
          startedAt: Timestamp.now(),
        };

        this.session.set(updated);
        await this.saveSession();
        this.startTimer();
      } else {
        this.session.set({
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        });
      }
    }, 1000);
  }

  private startTimer(): void {
    this.stopTimer();

    this.timerInterval = setInterval(async () => {
      const current = this.session();
      if (!current || (current.state !== 'focus' && current.state !== 'break')) {
        this.stopTimer();
        return;
      }

      if (current.remainingSeconds <= 1) {
        // Timer finished
        if (current.state === 'focus') {
          // Focus session completed, record stats and offer break
          const updated: PomodoroSession = {
            ...current,
            state: 'finished',
            remainingSeconds: 0,
            totalFocusTime: current.totalFocusTime, // Already accumulated second-by-second
            completedSessions: current.completedSessions + 1,
          };
          await this.flushStats(updated);
          // Keep the updated counters so they display correctly in the UI
          this.session.set(updated);
          await this.saveSession();
          this.stopTimer();
        } else if (current.state === 'break') {
          // Break finished
          const updated: PomodoroSession = {
            ...current,
            state: 'finished',
            remainingSeconds: 0,
          };
          this.session.set(updated);
          await this.saveSession();
          this.stopTimer();
        }
      } else {
        // Update totalFocusTime every second during focus sessions for real-time display
        let updatedTotalFocus = current.totalFocusTime;
        if (current.state === 'focus') {
          updatedTotalFocus = current.totalFocusTime + 1;
        }

        this.session.set({
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
          totalFocusTime: updatedTotalFocus,
        });

        // Save every 30 seconds to reduce writes
        if (current.remainingSeconds % 30 === 0) {
          await this.saveSession();
        }
      }
    }, 1000);
  }

  async startBreak(): Promise<void> {
    const current = this.session();
    if (!current || current.state !== 'finished') return;

    const updated: PomodoroSession = {
      ...current,
      state: 'break',
      remainingSeconds: current.breakDuration * 60,
      startedAt: Timestamp.now(),
    };

    this.session.set(updated);
    await this.saveSession();
    this.startTimer();
  }

  async continueSession(): Promise<void> {
    const current = this.session();
    if (!current || current.state !== 'finished') return;

    // Start a new focus session
    const updated: PomodoroSession = {
      ...current,
      state: 'countdown',
      remainingSeconds: this.countdownDuration,
      startedAt: null,
    };

    this.session.set(updated);
    await this.saveSession();
    this.startCountdown();
  }

  async pauseSession(): Promise<void> {
    const current = this.session();
    if (!current || (current.state !== 'focus' && current.state !== 'break')) return;

    this.stopTimer();

    const updated: PomodoroSession = {
      ...current,
      state: 'paused',
      pausedAt: Timestamp.now(),
    };

    this.session.set(updated);
    await this.saveSession();
  }

  async resumeSession(): Promise<void> {
    const current = this.session();
    if (!current || current.state !== 'paused') return;

    const updated: PomodoroSession = {
      ...current,
      state: 'focus', // Resume to focus (or could check what it was before)
      startedAt: Timestamp.now(),
      pausedAt: null,
    };

    this.session.set(updated);
    await this.saveSession();
    this.startTimer();
  }

  async endSession(): Promise<void> {
    const current = this.session();
    if (!current) return;

    // Save stats before clearing
    await this.flushStats(current);
    await this.clearSession();
  }

  private async flushStats(session: PomodoroSession): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const completed = session.completedSessions;
    const focusSeconds = session.totalFocusTime;

    if (!completed && !focusSeconds) return;

    try {
      const monthKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      const statsRef = doc(db, 'users', user.uid, 'pomodoroStats', monthKey);
      const statsSnap = await getDoc(statsRef);

      let stats: PomodoroStats = statsSnap.exists()
        ? (statsSnap.data() as PomodoroStats)
        : { totalSessions: 0, totalFocusMinutes: 0, bySubject: {} };

      stats.totalSessions += completed;
      stats.totalFocusMinutes += Math.floor(focusSeconds / 60);

      if (!stats.bySubject[session.subject]) {
        stats.bySubject[session.subject] = { sessions: 0, minutes: 0 };
      }
      stats.bySubject[session.subject].sessions += completed;
      stats.bySubject[session.subject].minutes += Math.floor(focusSeconds / 60);

      await setDoc(statsRef, stats);
    } catch (error) {
      console.error('Error saving pomodoro stats:', error);
    }
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  isSessionActive(): boolean {
    const session = this.session();
    return (
      session !== null &&
      (session.state === 'countdown' || session.state === 'focus' || session.state === 'break')
    );
  }

  isBlocking(): boolean {
    const session = this.session();
    return (
      session !== null &&
      (session.state === 'countdown' || session.state === 'focus' || session.state === 'break')
    );
  }
}
