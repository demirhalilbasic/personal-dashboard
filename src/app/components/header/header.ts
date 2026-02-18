import { Component, OnInit, OnDestroy, ChangeDetectorRef, effect, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth';
import { TrackerService, TrackerConfig, DayStatus } from '../../services/tracker';
import { NotificationService, AppNotification } from '../../services/notification';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {
  isMenuOpen = false;
  showNotifications = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  private notificationInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router,
    private trackerService: TrackerService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    // React to notification changes
    effect(() => {
      this.notifications = this.notificationService.getNotifications()();
      this.unreadCount = this.notifications.filter((n) => !n.read).length;
      this.cdr.detectChanges();
    });
  }

  async ngOnInit() {
    if (this.isAuthenticated()) {
      await this.notificationService.initializeListener();
      await this.checkAndGenerateNotifications();
      // Check for incomplete trackers every 5 minutes
      this.notificationInterval = setInterval(() => {
        this.checkAndGenerateNotifications();
      }, 300000);
    }
  }

  ngOnDestroy() {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
    }
    this.notificationService.stopListener();
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async checkAndGenerateNotifications() {
    if (!this.isAuthenticated()) return;

    try {
      const today = this.getLocalDateString(new Date());
      const dayStatus = await this.trackerService.getDayStatus(today);

      if (dayStatus) {
        const incompleteCount = dayStatus.totalTrackers - dayStatus.completedTrackers;

        if (incompleteCount > 0) {
          const settings = await this.trackerService.getUserSettings();
          const enabledTrackerIds = settings?.enabledTrackers || [];
          const incompleteTrackers: { id: string; name: string; icon: string }[] = [];

          for (const trackerId of enabledTrackerIds) {
            const entry = await this.trackerService.getTrackerEntry(trackerId, today);
            if (!entry?.completed) {
              const config = this.trackerService.getTrackerConfig(trackerId);
              if (config) {
                incompleteTrackers.push({
                  id: trackerId,
                  name: config.name,
                  icon: config.icon,
                });
              }
            }
          }

          await this.notificationService.generateTrackerNotifications(incompleteTrackers);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  closeNotifications() {
    this.showNotifications = false;
  }

  async markAsRead(notification: AppNotification) {
    await this.notificationService.markAsRead(notification.id);

    if (notification.action) {
      this.router.navigate([notification.action]);
      this.closeNotifications();
      this.closeMenu();
    }
  }

  async markAsUnread(notification: AppNotification, event: Event) {
    event.stopPropagation();
    await this.notificationService.markAsUnread(notification.id);
  }

  async markAllAsRead() {
    await this.notificationService.markAllAsRead();
  }

  async deleteNotification(notification: AppNotification, event: Event) {
    event.stopPropagation();
    await this.notificationService.deleteNotification(notification.id);
  }

  formatTimestamp(timestamp: any): string {
    return this.notificationService.formatTimestamp(timestamp);
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.closeMenu();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}
