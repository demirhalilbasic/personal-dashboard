import { Injectable, signal } from '@angular/core';
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
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService } from './auth';

export interface AppNotification {
  id: string;
  type: 'tracker' | 'reminder' | 'info' | 'achievement';
  title: string;
  message: string;
  icon: string;
  read: boolean;
  createdAt: Timestamp;
  action?: string;
  trackerId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notifications = signal<AppNotification[]>([]);
  private unsubscribe: Unsubscribe | null = null;

  constructor(private authService: AuthService) {}

  // Get notifications signal for reactive updates
  getNotifications() {
    return this.notifications;
  }

  // Get unread count
  getUnreadCount(): number {
    return this.notifications().filter((n) => !n.read).length;
  }

  // Initialize real-time listener for notifications
  async initializeListener(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    // Clean up existing listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      this.notifications.set(notifs);
    });
  }

  // Stop listening
  stopListener(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Load notifications from Firestore
  async loadNotifications(): Promise<AppNotification[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const notifs: AppNotification[] = [];
    snapshot.forEach((doc) => {
      notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
    });

    this.notifications.set(notifs);
    return notifs;
  }

  // Add a new notification
  async addNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
  ): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    // Check if similar notification already exists (for tracker notifications)
    if (notification.trackerId) {
      const existing = this.notifications().find(
        (n) => n.trackerId === notification.trackerId && !n.read
      );
      if (existing) {
        // Update existing notification instead of creating new
        return existing.id;
      }
    }

    const notificationId = `${notification.type}-${Date.now()}`;
    const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);

    const newNotification: AppNotification = {
      ...notification,
      id: notificationId,
      read: false,
      createdAt: Timestamp.now(),
    };

    await setDoc(notificationRef, newNotification);
    return notificationId;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });

    // Update local state
    const current = this.notifications();
    this.notifications.set(
      current.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  }

  // Mark notification as unread
  async markAsUnread(notificationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: false });

    // Update local state
    const current = this.notifications();
    this.notifications.set(
      current.map((n) => (n.id === notificationId ? { ...n, read: false } : n))
    );
  }

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const unread = this.notifications().filter((n) => !n.read);

    for (const notification of unread) {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notification.id);
      await updateDoc(notificationRef, { read: true });
    }

    // Update local state
    this.notifications.set(this.notifications().map((n) => ({ ...n, read: true })));
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await deleteDoc(notificationRef);

    // Update local state
    this.notifications.set(this.notifications().filter((n) => n.id !== notificationId));
  }

  // Delete all read notifications
  async deleteReadNotifications(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const readNotifications = this.notifications().filter((n) => n.read);

    for (const notification of readNotifications) {
      const notificationRef = doc(db, 'users', user.uid, 'notifications', notification.id);
      await deleteDoc(notificationRef);
    }

    // Update local state
    this.notifications.set(this.notifications().filter((n) => !n.read));
  }

  // Generate tracker notifications based on incomplete trackers
  async generateTrackerNotifications(
    incompleteTrackers: { id: string; name: string; icon: string }[]
  ): Promise<void> {
    for (const tracker of incompleteTrackers) {
      // Check if we already have a notification for this tracker today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingNotification = this.notifications().find(
        (n) => n.trackerId === tracker.id && n.createdAt.toDate() >= today && !n.read
      );

      if (!existingNotification) {
        await this.addNotification({
          type: 'tracker',
          title: `${tracker.icon} ${tracker.name}`,
          message: 'Ovaj tracker još nije popunjen danas.',
          icon: tracker.icon,
          action: `/my-trackers/${tracker.id}`,
          trackerId: tracker.id,
        });
      }
    }
  }

  // Remove notification for a completed tracker
  async removeTrackerNotification(trackerId: string): Promise<void> {
    const notification = this.notifications().find((n) => n.trackerId === trackerId && !n.read);

    if (notification) {
      await this.deleteNotification(notification.id);
    }
  }

  // Format timestamp for display
  formatTimestamp(timestamp: Timestamp): string {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Upravo sada';
    } else if (diffMins < 60) {
      return `Prije ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Prije ${diffHours}h`;
    } else if (diffDays === 1) {
      return 'Jučer';
    } else if (diffDays < 7) {
      return `Prije ${diffDays} dana`;
    } else {
      return date.toLocaleDateString('hr-HR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  }
}
