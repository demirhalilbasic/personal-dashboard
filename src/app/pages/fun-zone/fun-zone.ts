import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService, Theme } from '../../services/theme';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-fun-zone',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fun-zone.html',
  styleUrls: ['./fun-zone.css'],
})
export class FunZoneComponent implements OnInit {
  currentTheme: Theme | null = null;
  private isBrowser: boolean;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    // First try to get current theme, if null, load from localStorage
    this.currentTheme = this.themeService.getCurrentTheme();
    if (!this.currentTheme) {
      this.currentTheme = this.themeService.loadSavedTheme();
    }
    this.applyTheme();
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  games = [
    {
      name: 'Bingo',
      description: 'Interaktivna bingo kartica - popuni red, kolonu ili dijagonalu',
      route: '/fun-zone/bingo',
      icon: '🎯',
    },
    {
      name: 'Kviz',
      description: 'Testiraj svoje HTML znanje sa interaktivnim kvizom',
      route: '/fun-zone/quiz',
      icon: '❓',
    },
    {
      name: 'Vision Board',
      description: 'Kreiraj svoju vision ploču sa bilješkama, slikama i citatima',
      route: '/fun-zone/vision-board',
      icon: '📌',
    },
    {
      name: 'Whiteboard',
      description: 'Interaktivna tabla za crtanje i skiciranje',
      route: '/fun-zone/whiteboard',
      icon: '🎨',
    },
    {
      name: 'Kanban',
      description: 'Organizuj svoje zadatke sa Kanban tablonom',
      route: '/fun-zone/kanban',
      icon: '📋',
    },
    {
      name: 'Snake',
      description: 'Klasična zmijica igra - sakupljaj hranu i osvoji bodove',
      route: '/fun-zone/snake',
      icon: '🐍',
    },
  ];
}
