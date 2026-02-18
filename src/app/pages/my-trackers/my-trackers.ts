import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThemeService, Theme } from '../../services/theme';
import { AuthService } from '../../services/auth';
import {
  TrackerService,
  TrackerConfig,
  DayStatus,
  UserTrackerSettings,
} from '../../services/tracker';

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  status: DayStatus | null;
}

@Component({
  selector: 'app-my-trackers',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './my-trackers.html',
  styleUrls: ['./my-trackers.css'],
})
export class MyTrackersComponent implements OnInit, OnDestroy {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;
  private clockInterval: any;

  // Time display
  currentTime = {
    hours: '00',
    minutes: '00',
    seconds: '00',
    day: '',
    dayOfWeek: '',
    month: '',
    year: '',
    ampm: '',
    date: '',
  };

  // Countdown
  countdown = {
    hours: 0,
    minutes: 0,
    seconds: 0,
    percentage: 100,
  };

  // Tracker data
  enabledTrackers: TrackerConfig[] = [];
  availableTrackers: TrackerConfig[] = [];
  todayStatus: DayStatus | null = null;
  allCompleted = false;
  completionPercentage = 0;

  // Calendar
  calendarDays: CalendarDay[] = [];
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  monthNames = [
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
  dayNames = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

  // Settings modal
  showSettingsModal = false;
  selectedTrackers: string[] = [];
  trackerSettings: UserTrackerSettings | null = null;

  // Loading
  isLoading = true;
  isCalendarLoading = false;

  // Calendar request ID to cancel stale requests
  private calendarRequestId = 0;

  // Subscription for tracker entry changes
  private trackerEntrySubscription: Subscription | null = null;

  // Tracker completion status for today
  trackerCompletionStatus: Map<string, boolean> = new Map();

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private trackerService: TrackerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit() {
    // First try to get current theme, if null, load from localStorage
    this.currentTheme = this.themeService.getCurrentTheme();
    if (!this.currentTheme) {
      this.currentTheme = this.themeService.loadSavedTheme();
    }
    this.applyTheme();
    this.availableTrackers = this.trackerService.availableTrackers;

    if (this.isBrowser) {
      this.startClock();

      // Subscribe to tracker entry changes for real-time calendar updates
      this.trackerEntrySubscription = this.trackerService.trackerEntryChanged$.subscribe(
        async ({ date }) => {
          // Check if the changed date is in the currently displayed month
          const [year, month] = date.split('-').map(Number);
          if (year === this.currentYear && month - 1 === this.currentMonth) {
            // Refresh calendar to show updated status
            await this.generateCalendar();
            // Also refresh tracker data for today's completion status
            await this.loadTrackerData();
          }
        }
      );

      try {
        await this.loadTrackerData();
      } catch (error) {
        console.error('Error in loadTrackerData:', error);
        this.isLoading = false;
      }

      try {
        await this.generateCalendar();
      } catch (error) {
        console.error('Error in generateCalendar:', error);
      }
    }
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.trackerEntrySubscription) {
      this.trackerEntrySubscription.unsubscribe();
    }
  }

  private startClock() {
    this.updateTime();
    this.ngZone.runOutsideAngular(() => {
      this.clockInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.updateTime();
          this.updateCountdown();
          this.cdr.detectChanges();
        });
      }, 1000);
    });
  }

  private updateTime() {
    const now = new Date();
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;

    this.currentTime = {
      hours: String(hours24).padStart(2, '0'),
      minutes: String(now.getMinutes()).padStart(2, '0'),
      seconds: String(now.getSeconds()).padStart(2, '0'),
      day: String(now.getDate()),
      dayOfWeek: this.getDayName(now.getDay()),
      month: this.monthNames[now.getMonth()],
      year: String(now.getFullYear()),
      ampm: hours24 >= 12 ? 'PM' : 'AM',
      date: now.toISOString().split('T')[0],
    };
  }

  private getDayName(day: number): string {
    const days = ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
    return days[day];
  }

  private updateCountdown() {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const diff = endOfDay.getTime() - now.getTime();

    this.countdown.hours = Math.floor(diff / (1000 * 60 * 60));
    this.countdown.minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    this.countdown.seconds = Math.floor((diff % (1000 * 60)) / 1000);

    // Percentage of day remaining
    const totalSecondsInDay = 24 * 60 * 60;
    const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    this.countdown.percentage = Math.round((1 - secondsPassed / totalSecondsInDay) * 100);
  }

  getCountdownColor(): string {
    if (this.allCompleted) {
      return '#4CAF50'; // Green when all completed
    }

    const percentage = this.countdown.percentage;
    if (percentage > 50) {
      return 'var(--color-text, #333)'; // Normal
    } else if (percentage > 25) {
      return '#FFC107'; // Yellow/Warning
    } else if (percentage > 10) {
      return '#FF9800'; // Orange
    } else {
      return '#F44336'; // Red/Urgent
    }
  }

  private async loadTrackerData() {
    try {
      this.trackerSettings = await this.trackerService.getUserSettings();
      this.selectedTrackers = [...this.trackerSettings.enabledTrackers];
      this.enabledTrackers = this.trackerService.getEnabledTrackers();

      const now = new Date();
      const today = this.formatDateString(now.getFullYear(), now.getMonth(), now.getDate());
      this.todayStatus = await this.trackerService.getDayStatus(today);
      this.allCompleted = this.todayStatus.status === 'all';
      this.completionPercentage = await this.trackerService.getTodayCompletionPercentage();

      // Load individual tracker completion status
      this.trackerCompletionStatus.clear();
      for (const tracker of this.enabledTrackers) {
        const entry = await this.trackerService.getTrackerEntry(tracker.id, today);
        this.trackerCompletionStatus.set(tracker.id, entry?.completed || false);
      }

      this.isLoading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading tracker data:', error);
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async generateCalendar() {
    // Increment request ID to invalidate any previous pending requests
    const currentRequestId = ++this.calendarRequestId;
    this.isCalendarLoading = true;

    try {
      const firstDay = new Date(this.currentYear, this.currentMonth, 1);
      const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
      const startDay = (firstDay.getDay() + 6) % 7;

      const newCalendarDays: CalendarDay[] = [];

      const now = new Date();
      const today = this.formatDateString(now.getFullYear(), now.getMonth(), now.getDate());

      const daysInMonth = lastDay.getDate();

      const totalDaysNeeded = startDay + daysInMonth;
      const rowsNeeded = Math.ceil(totalDaysNeeded / 7);
      const totalCells = rowsNeeded * 7;

      const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

      for (let i = startDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = this.formatDateString(this.currentYear, this.currentMonth - 1, day);
        newCalendarDays.push({
          date,
          day,
          isCurrentMonth: false,
          isToday: date === today,
          status: null,
        });
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const date = this.formatDateString(this.currentYear, this.currentMonth, day);
        newCalendarDays.push({
          date,
          day,
          isCurrentMonth: true,
          isToday: date === today,
          status: null,
        });
      }

      const remainingDays = totalCells - newCalendarDays.length;

      for (let day = 1; day <= remainingDays; day++) {
        const date = this.formatDateString(this.currentYear, this.currentMonth + 1, day);
        newCalendarDays.push({
          date,
          day,
          isCurrentMonth: false,
          isToday: date === today,
          status: null,
        });
      }

      this.calendarDays = newCalendarDays;
      this.cdr.detectChanges();

      // Load statuses with request ID check
      await this.loadCalendarStatuses(currentRequestId);
    } catch (error) {
      console.error('Error generating calendar:', error);
      this.isCalendarLoading = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCalendarStatuses(requestId: number) {
    // Check if this request is still valid
    if (requestId !== this.calendarRequestId) return;

    try {
      // Use batch loading from cache for better performance
      const monthStatuses = await this.trackerService.getMonthCalendarCache(
        this.currentYear,
        this.currentMonth
      );

      // Check again if request is still valid after async operation
      if (requestId !== this.calendarRequestId) return;

      // Create a map for quick lookup
      const statusMap = new Map<string, DayStatus>();
      for (const status of monthStatuses) {
        statusMap.set(status.date, status);
      }

      // Update calendar days with statuses
      this.calendarDays = this.calendarDays.map((day) => {
        if (day.isCurrentMonth && statusMap.has(day.date)) {
          return { ...day, status: statusMap.get(day.date)! };
        }
        return day;
      });

      this.isCalendarLoading = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading calendar statuses:', error);
      this.isCalendarLoading = false;
      this.cdr.detectChanges();
    }
  }

  private formatDateString(year: number, month: number, day: number): string {
    // Create date and adjust for month/year boundaries
    const adjustedDate = new Date(year, month, day);
    const y = adjustedDate.getFullYear();
    const m = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const d = String(adjustedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getDayStatusClass(day: CalendarDay): string {
    if (!day.isCurrentMonth || !day.status) return '';

    switch (day.status.status) {
      case 'all':
        return 'status-all';
      case 'partial':
        return 'status-partial';
      case 'none':
        return 'status-none';
      default:
        return '';
    }
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  goToToday() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.generateCalendar();
  }

  navigateToTracker(trackerId: string) {
    this.router.navigate(['/my-trackers', trackerId]);
  }

  isTrackerCompletedToday(trackerId: string): boolean {
    return this.trackerCompletionStatus.get(trackerId) || false;
  }

  openSettingsModal() {
    this.showSettingsModal = true;
  }

  closeSettingsModal() {
    this.showSettingsModal = false;
  }

  toggleTracker(trackerId: string) {
    const index = this.selectedTrackers.indexOf(trackerId);
    if (index > -1) {
      this.selectedTrackers.splice(index, 1);
    } else {
      this.selectedTrackers.push(trackerId);
    }
  }

  isTrackerSelected(trackerId: string): boolean {
    return this.selectedTrackers.includes(trackerId);
  }

  async saveTrackerSettings() {
    try {
      const settings: UserTrackerSettings = {
        enabledTrackers: this.selectedTrackers,
        weekStartsOn: 'monday',
      };
      await this.trackerService.saveUserSettings(settings);
      this.trackerSettings = settings;
      this.enabledTrackers = this.trackerService.getEnabledTrackers();
      this.showSettingsModal = false;
      this.cdr.detectChanges();
      await this.loadTrackerData();
      await this.generateCalendar();
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showSettingsModal = false;
      this.cdr.detectChanges();
    }
  }

  getTrackersByCategory(category: string): TrackerConfig[] {
    return this.availableTrackers.filter((t) => t.category === category);
  }

  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      health: '🏥 Zdravlje',
      productivity: '📊 Produktivnost',
      wellness: '🧘 Wellness',
      finance: '💰 Finansije',
      personal: '👤 Osobno',
    };
    return names[category] || category;
  }

  private applyTheme() {
    if (!this.isBrowser || !this.currentTheme) return;

    const root = document.documentElement;
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
