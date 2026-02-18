import { Component, Input, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../../../../services/theme';
import { TrackerConfig } from '../../../../../services/tracker';

@Component({
  selector: 'app-tracker-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tracker-layout.html',
  styleUrls: ['./tracker-layout.css'],
})
export class TrackerLayoutComponent implements OnInit {
  @Input() tracker: TrackerConfig | null = null;
  @Input() selectedDate: string = new Date().toISOString().split('T')[0];
  @Input() streak: number = 0;
  @Input() weeklyProgress: number = 0;
  @Input() monthlyProgress: number = 0;
  @Input() isLoading: boolean = false;
  @Input() isSaving: boolean = false;

  currentTheme: Theme | null = null;
  private isBrowser: boolean;

  constructor(private themeService: ThemeService, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.applyTheme();
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
}
