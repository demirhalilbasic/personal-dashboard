import { Injectable } from '@angular/core';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase.config';

/**
 * API Categories for tracking different API calls
 */
export type ApiCategory =
  | 'openMeteo' // Weather API (Open-Meteo)
  | 'airQuality' // Air Quality API (Open-Meteo)
  | 'prokerala' // Horoscope API (Prokerala)
  | 'openRouter' // AI/Quiz generation (OpenRouter)
  | 'myMemory' // Translation API (MyMemory)
  | 'aiInsight'; // AI Health Insight (OpenRouter)

/**
 * Monthly API stats document structure
 */
export interface MonthlyApiStats {
  openMeteo: number;
  airQuality: number;
  prokerala: number;
  openRouter: number;
  myMemory: number;
  aiInsight: number;
  lastUpdated: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ApiStatsService {
  constructor() {}

  /**
   * Get current month key in format YYYY-MM (e.g., "2026-01")
   */
  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Increment API call counter for a specific category
   * @param category - The API category to increment
   */
  async incrementApiCall(category: ApiCategory): Promise<void> {
    const monthKey = this.getCurrentMonthKey();
    const docRef = doc(db, 'apiStats', monthKey);

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        // Update existing document
        await updateDoc(docRef, {
          [category]: increment(1),
          lastUpdated: new Date(),
        });
      } else {
        // Create new document for this month
        const initialStats: MonthlyApiStats = {
          openMeteo: 0,
          airQuality: 0,
          prokerala: 0,
          openRouter: 0,
          myMemory: 0,
          aiInsight: 0,
          lastUpdated: new Date(),
        };
        initialStats[category] = 1;

        await setDoc(docRef, initialStats);
      }

      console.log(`[API Stats] Incremented ${category} for ${monthKey}`);
    } catch (err) {
      console.error('[API Stats] Failed to increment counter:', err);
      // Don't throw - this is not critical functionality
    }
  }

  /**
   * Get API stats for a specific month
   * @param monthKey - Month key in format YYYY-MM (defaults to current month)
   */
  async getMonthlyStats(monthKey?: string): Promise<MonthlyApiStats | null> {
    const key = monthKey || this.getCurrentMonthKey();
    const docRef = doc(db, 'apiStats', key);

    try {
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as MonthlyApiStats;
      }
      return null;
    } catch (err) {
      console.error('[API Stats] Failed to get stats:', err);
      return null;
    }
  }

  /**
   * Get total API calls for a specific month
   * @param monthKey - Month key in format YYYY-MM (defaults to current month)
   */
  async getTotalCalls(monthKey?: string): Promise<number> {
    const stats = await this.getMonthlyStats(monthKey);

    if (!stats) return 0;

    return (
      stats.openMeteo +
      stats.airQuality +
      stats.prokerala +
      stats.openRouter +
      stats.myMemory +
      stats.aiInsight
    );
  }

  /**
   * Get API calls for a specific category in current month
   * @param category - The API category
   */
  async getCategoryCount(category: ApiCategory): Promise<number> {
    const stats = await this.getMonthlyStats();

    if (!stats) return 0;

    return stats[category] || 0;
  }

  /**
   * Get formatted month name for display
   * @param monthKey - Month key in format YYYY-MM
   */
  getMonthDisplayName(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    const monthNames = [
      'Januar',
      'Februar',
      'Mart',
      'April',
      'Maj',
      'Juni',
      'Juli',
      'August',
      'Septembar',
      'Oktobar',
      'Novembar',
      'Decembar',
    ];

    return `${monthNames[parseInt(month) - 1]} ${year}`;
  }
}
