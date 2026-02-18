import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserData, UserWeatherSettings } from '../../services/auth';
import { ThemeService, Theme } from '../../services/theme';
import { WeatherService, POPULAR_CITIES } from '../../services/weather';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit, OnDestroy {
  userData: UserData | null = null;
  currentTheme: Theme | null = null;
  themes: Theme[] = [];
  previewThemeId: string = '';
  activeThemeId: string = '';
  successMessage: string = '';
  errorMessage: string = '';
  isReady = false;
  loadError = '';
  private descriptionInterval: any;
  private descriptionIndex: number = 0;
  themePopupVisible = false;
  themePopupMessage = '';
  themeEmojiRain: string[] = [];
  themeEmojiRainActive = false;

  // Weather settings
  weatherSettings: UserWeatherSettings | null = null;
  citySearchQuery = '';
  citySearchResults: Array<{ city: string; country: string; latitude: number; longitude: number }> =
    [];
  isSearchingCities = false;
  selectedCity: { city: string; country: string; latitude: number; longitude: number } | null =
    null;
  temperatureUnit: 'celsius' | 'fahrenheit' = 'celsius';
  windSpeedUnit: 'kmh' | 'mph' | 'ms' = 'kmh';
  popularCities = POPULAR_CITIES;
  weatherSaveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  private searchTimeout: any;

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private weatherService: WeatherService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Fallback timer: izađi iz loadera ako auth/podaci zaglave
    setTimeout(() => {
      if (!this.isReady) {
        this.loadError =
          'Spor odziv ili problem s podacima. Pokušajte osvježiti stranicu ili se ponovo prijaviti.';
        this.isReady = true;
      }
    }, 6000);

    this.init();
  }

  private async init() {
    try {
      const authWait = await this.waitWithTimeout(this.authService.waitForAuthReady(), 5000);
      const dataWait = await this.waitWithTimeout(this.authService.waitForUserData(), 5000);

      if (authWait === 'timeout' || dataWait === 'timeout') {
        this.loadError = 'Spora konekcija prema autentikaciji. Pokušajte osvježiti stranicu.';
      }

      if (!this.authService.isAuthenticated()) {
        this.loadError = 'Sesija je istekla. Prijavite se ponovo.';
        this.router.navigate(['/login']);
        return;
      }

      this.userData = this.authService.getUserData();
      this.themes = this.themeService.themes;

      if (!this.userData) {
        this.loadError = 'Podaci korisnika nisu dostupni.';
        return;
      }

      const selected = this.userData.selectedTheme || this.themes[0]?.id;
      this.currentTheme = this.themeService.getThemeById(selected) || this.themes[0] || null;
      this.activeThemeId = this.currentTheme?.id || '';

      if (this.currentTheme) {
        this.applyThemeColors(this.currentTheme);
        this.applyPageBackground(this.currentTheme);
      }

      // Load weather settings
      await this.loadWeatherSettings();

      this.descriptionInterval = setInterval(() => {
        const active = this.getActiveTheme();
        const len = active?.descriptions.length || 1;
        this.descriptionIndex = (this.descriptionIndex + 1) % len;
      }, 4000);
    } finally {
      if (!this.userData || !this.currentTheme) {
        if (!this.loadError) {
          this.loadError = 'Nije moguće učitati korisničke podatke. Pokušajte osvježiti stranicu.';
        }
      }
      this.isReady = true;
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  private waitWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve('timeout' as const), ms);
      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch(() => {
          clearTimeout(timer);
          resolve('timeout' as const);
        });
    });
  }

  ngOnDestroy() {
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Reset to defaults on leave (browser only)
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', '#345aaa');
      root.style.setProperty('--color-secondary', '#2a4a8a');
      root.style.setProperty('--color-accent', '#ff9800');
      root.style.setProperty('--color-background', '#f5f5f5');
      root.style.setProperty('--color-surface', '#ffffff');
      root.style.setProperty('--color-text', '#333333');
      root.style.setProperty('--color-textSecondary', '#666666');

      document.body.style.background =
        'linear-gradient(135deg, #e8f0f7 0%, #d4e3f0 50%, #c5d9ed 100%)';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  previewTheme(themeId: string) {
    this.previewThemeId = themeId;
    const theme = this.themeService.getThemeById(themeId);
    if (theme) {
      this.applyThemeColors(theme);
      this.applyPageBackground(theme);
    }
  }

  clearPreview() {
    this.previewThemeId = '';
    // Revert to active theme colors after hover ends
    if (this.currentTheme) {
      this.applyThemeColors(this.currentTheme);
      this.applyPageBackground(this.currentTheme);
    }
  }

  getPreviewTheme(): Theme | null {
    return this.themeService.getThemeById(this.previewThemeId) || null;
  }

  getPreviewDescription(): string {
    const theme = this.getPreviewTheme();
    if (!theme) return '';
    return theme.descriptions[this.descriptionIndex % theme.descriptions.length];
  }

  getActiveTheme(): Theme | null {
    const id = this.previewThemeId || this.activeThemeId;
    return this.themeService.getThemeById(id) || this.currentTheme;
  }

  getActiveDescription(): string {
    const theme = this.getActiveTheme();
    if (!theme) return '';
    return theme.descriptions[this.descriptionIndex % theme.descriptions.length];
  }

  async selectTheme(themeId: string) {
    if (!this.userData || themeId === this.userData.selectedTheme) {
      return;
    }

    try {
      // Odmah primeni temu i pokreni animacije
      await this.authService.updateUserTheme(this.userData.uid, themeId);
      this.themeService.setTheme(themeId);
      this.currentTheme = this.themeService.getCurrentTheme();
      this.activeThemeId = themeId;
      this.userData = { ...this.userData, selectedTheme: themeId };

      if (this.currentTheme) {
        this.applyThemeColors(this.currentTheme);
        this.applyPageBackground(this.currentTheme);

        // Pokreni emoji rain i prikaži pop-up sa cool opisom
        this.triggerThemeRain();
        this.showThemePopup();
      }

      // Bez obzira na hover, badge "Odabrano" će se prikazati odmah
      this.previewThemeId = '';
      this.cdr.detectChanges();
    } catch (error: any) {
      this.errorMessage = error.message || 'Greška pri promjeni teme';
      setTimeout(() => {
        this.errorMessage = '';
      }, 3000);
    }
  }

  private applyThemeColors(theme: Theme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  private applyPageBackground(theme: Theme) {
    if (typeof document === 'undefined') return;
    document.body.style.background = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }

  private pickRandom(arr: string[], count: number): string[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private triggerThemeRain() {
    if (this.themeEmojiRainActive || !this.currentTheme) return;

    const themeEmojis: Record<string, string[]> = {
      cyberpunk: ['🌃', '🔮', '🤖', '💻', '👾', '⚡', '🌌', '👀'],
      nature: ['🌿', '🌸', '🌳', '🦋', '🌻', '🌼', '🍂', '🍄'],
      ocean: ['🌊', '🐟', '🐬', '🧜', '⚓', '🐙', '🪸', '🐋'],
      sunset: ['🌅', '🌄', '✨', '🦋', '🌟', '🌈', '☀️', '🌺'],
      minimal: ['⚪', '⬜', '▫️', '▪️', '◽', '◾', '➖', '➕'],
      neon: ['💥', '🌈', '⚡', '💫', '🔥', '✨', '🌟', '💜'],
      classic: ['📚', '🖊️', '🧔', '🏛️', '📜', '🎵', '🍵', '🗝️'],
      dark: ['🌑', '🌌', '⬛', '🔮', '🦧', '🖤', '🌌', '✨'],
      pastel: ['🎀', '🌸', '🍬', '🧁', '🍨', '🦋', '☁️', '🌷'],
      retro: ['📼', '📟', '🎮', '🌍', '🚀', '🕺', '🌟', '📺'],
    };

    const emojis = themeEmojis[this.currentTheme.id] || ['✨', '⭐', '💫'];
    this.themeEmojiRain = this.pickRandom([...emojis, ...emojis, ...emojis], 15);
    this.themeEmojiRainActive = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.themeEmojiRainActive = false;
      this.themeEmojiRain = [];
      this.cdr.detectChanges();
    }, 3500);
  }

  private showThemePopup() {
    if (!this.currentTheme) return;

    const themeCoolReasons: Record<string, string> = {
      cyberpunk: '🌃 Futuristički i tehnološki - savršeno za digitalne nomade!',
      nature: '🌿 Prirodno i smirujuće - donosi mir u tvoj dan!',
      ocean: '🌊 Duboko i misteriozno - kao beskrajno more mogućnosti!',
      sunset: '🌅 Toplo i romantično - svaki dan je novi početak!',
      minimal: '⚪ Jednostavno i elegantno - manje je više!',
      neon: '💥 Živo i energično - pune pare stila!',
      classic: '📚 Vremenski i sofisticirano - klasa nikad ne izlazi iz mode!',
      dark: '🌑 Mistično i moćno - za one koji vole mrak!',
      pastel: '🎀 Nežno i slatko - kao san na javi!',
      retro: '📼 Nostalgično i cool - povratak u najbolje dane!',
    };

    this.themePopupMessage =
      themeCoolReasons[this.currentTheme.id] ||
      '✨ Odlična tema - tvoj dashboard je sad još bolji!';
    this.themePopupVisible = true;

    setTimeout(() => {
      this.themePopupVisible = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  // Weather Settings Methods
  private async loadWeatherSettings() {
    if (!this.userData) return;

    try {
      const settings = await this.weatherService.getUserWeatherSettings(this.userData.uid);
      if (settings) {
        this.weatherSettings = settings;
        this.selectedCity = {
          city: settings.city,
          country: settings.country || '',
          latitude: settings.latitude,
          longitude: settings.longitude,
        };
        this.temperatureUnit = settings.temperatureUnit;
        this.windSpeedUnit = settings.windSpeedUnit;
      }
    } catch (err) {
      console.error('Failed to load weather settings:', err);
    }
  }

  async searchCities() {
    if (this.citySearchQuery.length < 2) {
      this.citySearchResults = [];
      return;
    }

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(async () => {
      this.isSearchingCities = true;
      this.citySearchResults = await this.weatherService.searchCities(this.citySearchQuery);
      this.isSearchingCities = false;
      this.cdr.detectChanges();
    }, 300);
  }

  selectCityFromSearch(city: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }) {
    this.selectedCity = city;
    this.citySearchQuery = '';
    this.citySearchResults = [];
  }

  selectPopularCity(city: { city: string; country: string; latitude: number; longitude: number }) {
    this.selectedCity = city;
  }

  async saveWeatherSettings() {
    if (!this.selectedCity || !this.userData) return;

    this.weatherSaveStatus = 'saving';

    try {
      const newSettings: UserWeatherSettings = {
        city: this.selectedCity.city,
        country: this.selectedCity.country,
        latitude: this.selectedCity.latitude,
        longitude: this.selectedCity.longitude,
        temperatureUnit: this.temperatureUnit,
        windSpeedUnit: this.windSpeedUnit,
      };

      await this.weatherService.saveUserWeatherSettings(this.userData.uid, newSettings);
      this.weatherSettings = newSettings;
      this.weatherSaveStatus = 'saved';

      setTimeout(() => {
        this.weatherSaveStatus = 'idle';
        this.cdr.detectChanges();
      }, 2000);
    } catch (err) {
      this.weatherSaveStatus = 'error';
      setTimeout(() => {
        this.weatherSaveStatus = 'idle';
        this.cdr.detectChanges();
      }, 3000);
    }

    this.cdr.detectChanges();
  }

  hasWeatherChanges(): boolean {
    if (!this.weatherSettings && this.selectedCity) return true;
    if (!this.weatherSettings || !this.selectedCity) return false;

    return (
      this.weatherSettings.city !== this.selectedCity.city ||
      this.weatherSettings.latitude !== this.selectedCity.latitude ||
      this.weatherSettings.temperatureUnit !== this.temperatureUnit ||
      this.weatherSettings.windSpeedUnit !== this.windSpeedUnit
    );
  }
}
