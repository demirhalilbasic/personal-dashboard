import { Injectable } from '@angular/core';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  increment,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

// ==================== INTERFACES ====================

export interface BingoStats {
  gamesPlayed: number;
  wins: number;
  shortestGameSeconds: number | null;
  totalTimePlayedSeconds: number;
  lastPlayed: Timestamp | null;
  winStreak: number;
  bestWinStreak: number;
}

export interface QuizStats {
  totalQuizzes: number;
  correctAnswers: number;
  totalQuestions: number;
  bestScore: number;
  lastPlayed: Timestamp | null;
  topicsPlayed: string[];
  quizzesByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface SnakeStats {
  gamesPlayed: number;
  highScore: number;
  totalScore: number;
  lastPlayed: Timestamp | null;
  averageScore: number;
}

export interface KanbanStats {
  boardsCreated: number;
  tasksCreated: number;
  tasksCompleted: number;
  lastUsed: Timestamp | null;
}

export interface KanbanTask {
  id: number;
  text: string;
  status: 'todo' | 'progress' | 'done';
}

export interface KanbanData {
  tasks: KanbanTask[];
  lastUpdated: Timestamp | null;
}

export interface VisionBoardStats {
  boardsCreated: number;
  pinsAdded: number;
  categoriesUsed: string[];
  lastUsed: Timestamp | null;
}

export interface WhiteboardStats {
  sessionsStarted: number;
  drawingsExported: number;
  lastUsed: Timestamp | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  additionalInfo?: string;
}

export interface MonthlyLeaderboard {
  bingo: LeaderboardEntry[];
  quiz: LeaderboardEntry[];
  snake: LeaderboardEntry[];
  updatedAt: Timestamp;
}

// ==================== SERVICE ====================

@Injectable({
  providedIn: 'root',
})
export class FunZoneService {
  constructor(private authService: AuthService) {}

  private getUserId(): string | null {
    const user = this.authService.getCurrentUser();
    return user?.uid || null;
  }

  private getUserDisplayName(): string {
    const userData = this.authService.getUserData();
    if (userData) {
      return `${userData.ime} ${userData.prezime.charAt(0)}.`;
    }
    return 'Anoniman';
  }

  // ==================== BINGO ====================

  async getBingoStats(): Promise<BingoStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'bingo');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as BingoStats;
    }

    // Initialize with default values
    const defaultStats: BingoStats = {
      gamesPlayed: 0,
      wins: 0,
      shortestGameSeconds: null,
      totalTimePlayedSeconds: 0,
      lastPlayed: null,
      winStreak: 0,
      bestWinStreak: 0,
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateBingoStats(won: boolean, gameTimeSeconds: number): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'bingo');
    const currentStats = await this.getBingoStats();

    if (!currentStats) return;

    const updates: Partial<BingoStats> = {
      gamesPlayed: currentStats.gamesPlayed + 1,
      totalTimePlayedSeconds: currentStats.totalTimePlayedSeconds + gameTimeSeconds,
      lastPlayed: Timestamp.now(),
    };

    if (won) {
      updates.wins = currentStats.wins + 1;
      updates.winStreak = currentStats.winStreak + 1;

      if (updates.winStreak! > currentStats.bestWinStreak) {
        updates.bestWinStreak = updates.winStreak;
      }

      // Check for shortest game
      if (
        currentStats.shortestGameSeconds === null ||
        gameTimeSeconds < currentStats.shortestGameSeconds
      ) {
        updates.shortestGameSeconds = gameTimeSeconds;
      }
    } else {
      updates.winStreak = 0;
    }

    await updateDoc(docRef, updates);

    // Update leaderboard
    if (won) {
      await this.updateLeaderboard('bingo', currentStats.wins + 1);
    }
  }

  // ==================== QUIZ ====================

  async getQuizStats(): Promise<QuizStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'quiz');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as QuizStats;
    }

    const defaultStats: QuizStats = {
      totalQuizzes: 0,
      correctAnswers: 0,
      totalQuestions: 0,
      bestScore: 0,
      lastPlayed: null,
      topicsPlayed: [],
      quizzesByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateQuizStats(
    correctAnswers: number,
    totalQuestions: number,
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'quiz');
    const currentStats = await this.getQuizStats();

    if (!currentStats) return;

    const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);

    const updates: any = {
      totalQuizzes: currentStats.totalQuizzes + 1,
      correctAnswers: currentStats.correctAnswers + correctAnswers,
      totalQuestions: currentStats.totalQuestions + totalQuestions,
      lastPlayed: Timestamp.now(),
      [`quizzesByDifficulty.${difficulty}`]: currentStats.quizzesByDifficulty[difficulty] + 1,
    };

    if (scorePercent > currentStats.bestScore) {
      updates.bestScore = scorePercent;
    }

    if (!currentStats.topicsPlayed.includes(topic)) {
      updates.topicsPlayed = arrayUnion(topic);
    }

    await updateDoc(docRef, updates);

    // Update leaderboard with average score
    const newTotal = currentStats.correctAnswers + correctAnswers;
    const newQuestions = currentStats.totalQuestions + totalQuestions;
    const avgScore = Math.round((newTotal / newQuestions) * 100);
    await this.updateLeaderboard('quiz', avgScore);
  }

  // ==================== SNAKE ====================

  async getSnakeStats(): Promise<SnakeStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'snake');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as SnakeStats;
    }

    const defaultStats: SnakeStats = {
      gamesPlayed: 0,
      highScore: 0,
      totalScore: 0,
      lastPlayed: null,
      averageScore: 0,
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateSnakeStats(score: number): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'snake');
    const currentStats = await this.getSnakeStats();

    if (!currentStats) return;

    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newTotalScore = currentStats.totalScore + score;
    const newAverageScore = Math.round(newTotalScore / newGamesPlayed);

    const updates: Partial<SnakeStats> = {
      gamesPlayed: newGamesPlayed,
      totalScore: newTotalScore,
      averageScore: newAverageScore,
      lastPlayed: Timestamp.now(),
    };

    if (score > currentStats.highScore) {
      updates.highScore = score;
    }

    await updateDoc(docRef, updates);

    // Update leaderboard with high score
    const finalHighScore = Math.max(score, currentStats.highScore);
    await this.updateLeaderboard('snake', finalHighScore);
  }

  // ==================== KANBAN ====================

  async getKanbanStats(): Promise<KanbanStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'kanban');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as KanbanStats;
    }

    const defaultStats: KanbanStats = {
      boardsCreated: 0,
      tasksCreated: 0,
      tasksCompleted: 0,
      lastUsed: null,
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateKanbanTaskCreated(): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'kanban');
    await updateDoc(docRef, {
      tasksCreated: increment(1),
      lastUsed: Timestamp.now(),
    });
  }

  async updateKanbanTaskCompleted(): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'kanban');
    await updateDoc(docRef, {
      tasksCompleted: increment(1),
      lastUsed: Timestamp.now(),
    });
  }

  // Kanban Tasks Persistence
  async saveKanbanTasks(tasks: KanbanTask[]): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'kanban-tasks');
    const data: KanbanData = {
      tasks: tasks,
      lastUpdated: Timestamp.now(),
    };

    await setDoc(docRef, data);
  }

  async loadKanbanTasks(): Promise<KanbanTask[]> {
    const userId = this.getUserId();
    if (!userId) return [];

    const docRef = doc(db, 'users', userId, 'funzone', 'kanban-tasks');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as KanbanData;
      return data.tasks || [];
    }

    return [];
  }

  // ==================== VISION BOARD ====================

  async getVisionBoardStats(): Promise<VisionBoardStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'visionboard');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as VisionBoardStats;
    }

    const defaultStats: VisionBoardStats = {
      boardsCreated: 0,
      pinsAdded: 0,
      categoriesUsed: [],
      lastUsed: null,
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateVisionBoardPinAdded(category?: string): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'visionboard');
    const updates: any = {
      pinsAdded: increment(1),
      lastUsed: Timestamp.now(),
    };

    if (category) {
      updates.categoriesUsed = arrayUnion(category);
    }

    await updateDoc(docRef, updates);
  }

  // ==================== WHITEBOARD ====================

  async getWhiteboardStats(): Promise<WhiteboardStats | null> {
    const userId = this.getUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'funzone', 'whiteboard');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as WhiteboardStats;
    }

    const defaultStats: WhiteboardStats = {
      sessionsStarted: 0,
      drawingsExported: 0,
      lastUsed: null,
    };

    await setDoc(docRef, defaultStats);
    return defaultStats;
  }

  async updateWhiteboardSession(): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'whiteboard');
    await updateDoc(docRef, {
      sessionsStarted: increment(1),
      lastUsed: Timestamp.now(),
    });
  }

  async updateWhiteboardExport(): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const docRef = doc(db, 'users', userId, 'funzone', 'whiteboard');
    await updateDoc(docRef, {
      drawingsExported: increment(1),
      lastUsed: Timestamp.now(),
    });
  }

  // ==================== LEADERBOARD ====================

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async updateLeaderboard(game: 'bingo' | 'quiz' | 'snake', score: number): Promise<void> {
    const userId = this.getUserId();
    if (!userId) return;

    const monthKey = this.getMonthKey();
    const docRef = doc(db, 'leaderboard', monthKey);

    try {
      const docSnap = await getDoc(docRef);
      let leaderboard: MonthlyLeaderboard;

      if (docSnap.exists()) {
        leaderboard = docSnap.data() as MonthlyLeaderboard;
      } else {
        leaderboard = {
          bingo: [],
          quiz: [],
          snake: [],
          updatedAt: Timestamp.now(),
        };
      }

      const displayName = this.getUserDisplayName();
      const gameBoard = leaderboard[game];

      // Find if user already exists in leaderboard
      const existingIndex = gameBoard.findIndex((e) => e.userId === userId);

      if (existingIndex >= 0) {
        // Update only if new score is better
        if (score > gameBoard[existingIndex].score) {
          gameBoard[existingIndex].score = score;
          gameBoard[existingIndex].displayName = displayName;
        }
      } else {
        // Add new entry
        gameBoard.push({
          rank: 0,
          userId: userId,
          displayName,
          score,
        });
      }

      // Sort by score descending and keep top 10
      gameBoard.sort((a, b) => b.score - a.score);
      const top10 = gameBoard.slice(0, 10);

      // Update ranks
      top10.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      leaderboard[game] = top10;
      leaderboard.updatedAt = Timestamp.now();

      await setDoc(docRef, leaderboard);
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }

  async getLeaderboard(): Promise<MonthlyLeaderboard | null> {
    const monthKey = this.getMonthKey();
    const docRef = doc(db, 'leaderboard', monthKey);

    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as MonthlyLeaderboard;
      }
      return null;
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return null;
    }
  }

  // ==================== ALL STATS ====================

  async getAllStats(): Promise<{
    bingo: BingoStats | null;
    quiz: QuizStats | null;
    snake: SnakeStats | null;
    kanban: KanbanStats | null;
    visionBoard: VisionBoardStats | null;
    whiteboard: WhiteboardStats | null;
  }> {
    const [bingo, quiz, snake, kanban, visionBoard, whiteboard] = await Promise.all([
      this.getBingoStats(),
      this.getQuizStats(),
      this.getSnakeStats(),
      this.getKanbanStats(),
      this.getVisionBoardStats(),
      this.getWhiteboardStats(),
    ]);

    return { bingo, quiz, snake, kanban, visionBoard, whiteboard };
  }
}
