import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  NgZone,
  inject,
  effect,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserData } from '../../services/auth';
import { ThemeService, Theme } from '../../services/theme';
import { WeatherService, WEATHER_CODES } from '../../services/weather';
import { AIInsightService } from '../../services/ai-insight';
import { ApiStatsService } from '../../services/api-stats';
import { PomodoroService, PomodoroSession } from '../../services/pomodoro';
import { Timestamp } from 'firebase/firestore';
import { LeaderboardSliderComponent } from '../../components/leaderboard-slider/leaderboard-slider';
import { WeatherWidgetComponent } from '../../components/weather-widget/weather-widget';
import { AiInsightWidgetComponent } from '../../components/ai-insight-widget/ai-insight-widget';
import { PomodoroTimerComponent } from '../../components/pomodoro-timer/pomodoro-timer';
import { TriviaItem, getRandomTriviaForGender } from './daily-trivia';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterLink,
    LeaderboardSliderComponent,
    WeatherWidgetComponent,
    AiInsightWidgetComponent,
    PomodoroTimerComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  // Expose Math to template
  Math = Math;

  userData: UserData | null = null;
  currentTheme: Theme | null = null;
  zodiacInfo: ZodiacInfo | null = null;
  horoscopeText: string = '';
  horoscopeTextTranslated: string = '';
  horoscopeLanguage: 'en' | 'bs' = 'en';
  horoscopeTranslating = false;
  horoscopeStatus: 'idle' | 'loading' | 'error' = 'idle';
  isReady = false;
  loadError = '';
  insightOpen = false;
  insightStatus: 'idle' | 'loading' | 'error' = 'idle';
  insightText = '';
  weatherSummary: string = '';
  dailyTrivia: TriviaItem | null = null;
  private triviaInterval: any;
  loadingMessages = [
    'Pripremam zvjezdani uvid…',
    'Povezujem konstelacije…',
    'Dodajem mrvu pop-kulture…',
    'Tražim najbolju priču za tebe…',
    'Miješam horoskop sa tvojim traitom…',
  ];
  loadingMessageIndex = 0;
  themeEmojiRain: string[] = [];
  themeEmojiRainActive = false;
  private loadingMessageInterval: any;
  private descriptionInterval: any;
  private descriptionIndex: number = 0;
  private apiStatsService = inject(ApiStatsService);
  pomodoroService = inject(PomodoroService);
  pomodoroSession: PomodoroSession | null = null;
  private ngZone = inject(NgZone);

  // Horoscope cache settings
  private readonly HOROSCOPE_CACHE_KEY = 'horoscope_cache';
  private readonly HOROSCOPE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private weatherService: WeatherService,
    private aiInsightService: AIInsightService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    // React to pomodoro session changes
    effect(() => {
      this.pomodoroSession = this.pomodoroService.getSessionSignal()();
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit() {
    // Fallback timer: ako nešto krene po zlu, izađi iz loadera nakon 6s
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
      if (!this.userData) {
        this.loadError = 'Podaci korisnika nisu dostupni.';
        return;
      }

      // Apply user's selected theme; fallback na prvu temu ako id nije pronađen
      this.themeService.setTheme(this.userData.selectedTheme || this.themeService.themes[0].id);
      this.currentTheme = this.themeService.getCurrentTheme();

      if (!this.currentTheme) {
        this.loadError = 'Tema nije pronađena.';
        return;
      }

      this.zodiacInfo = this.determineZodiac(this.userData.datumRodjenja);

      if (this.zodiacInfo && typeof window !== 'undefined') {
        this.fetchHoroscope(this.zodiacInfo.name);
      }

      if (this.currentTheme && typeof document !== 'undefined') {
        document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
        document.body.style.backgroundAttachment = 'fixed';
      }

      // Rotate theme description outside Angular to avoid ExpressionChanged errors
      this.ngZone.runOutsideAngular(() => {
        this.descriptionInterval = setInterval(() => {
          this.ngZone.run(() => {
            this.descriptionIndex =
              (this.descriptionIndex + 1) % (this.currentTheme?.descriptions.length || 1);
            this.cdr.markForCheck();
          });
        }, 4000);
      });

      // Start daily trivia rotation
      this.updateDailyTrivia();
      this.triviaInterval = setInterval(() => {
        this.updateDailyTrivia();
      }, 60000); // Refresh every minute
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

  private mapToEnglishSign(localName: string): string | null {
    const map: Record<string, string> = {
      Jarac: 'capricorn',
      Vodolija: 'aquarius',
      Ribe: 'pisces',
      Ovan: 'aries',
      Ovnica: 'aries',
      Bik: 'taurus',
      Bikica: 'taurus',
      Blizanci: 'gemini',
      Blizanka: 'gemini',
      Rak: 'cancer',
      Rakica: 'cancer',
      Lav: 'leo',
      Lavica: 'leo',
      Djevica: 'virgo',
      Vaga: 'libra',
      Škorpija: 'scorpio',
      Strijelac: 'sagittarius',
      Strijelčica: 'sagittarius',
    };
    return map[localName] || null;
  }

  // Horoscope cache methods
  private getCachedHoroscope(sign: string): { text: string; translated: string } | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.HOROSCOPE_CACHE_KEY);
      if (!cached) return null;

      const { sign: cachedSign, text, translated, timestamp, date } = JSON.parse(cached);
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];

      // Check if cache is still valid (within 1 hour AND same day AND same sign)
      if (
        now - timestamp < this.HOROSCOPE_CACHE_DURATION &&
        date === today &&
        cachedSign === sign
      ) {
        return { text, translated };
      }

      // Cache expired or different day/sign
      localStorage.removeItem(this.HOROSCOPE_CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Error reading horoscope cache:', err);
      return null;
    }
  }

  private setCachedHoroscope(sign: string, text: string, translated: string = ''): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = {
        sign,
        text,
        translated,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
      };
      localStorage.setItem(this.HOROSCOPE_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Error saving horoscope cache:', err);
    }
  }

  private async fetchHoroscope(localSign: string) {
    const sign = this.mapToEnglishSign(localSign);
    if (!sign) {
      this.horoscopeStatus = 'error';
      this.horoscopeText = 'Nije moguće odrediti znak za horoskop.';
      return;
    }

    // Try to load from cache first
    const cached = this.getCachedHoroscope(sign);
    if (cached) {
      console.log('[Horoscope] Loaded from cache');
      this.horoscopeText = cached.text;
      this.horoscopeTextTranslated = cached.translated;
      this.horoscopeLanguage = cached.translated ? 'bs' : 'en';
      this.horoscopeStatus = 'idle';
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
      return;
    }

    // No cache, fetch from API
    this.horoscopeStatus = 'loading';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const userName = this.userData?.ime || 'Unknown';
      const res = await fetch(
        `/api/horoscope?sign=${encodeURIComponent(sign)}&userName=${encodeURIComponent(userName)}`,
        {
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('API error');

      // Track Prokerala API call
      this.apiStatsService.incrementApiCall('prokerala');

      const data = await res.json();
      // Prokerala response structure: prefer data.prediction / data.description if present
      const text =
        data?.data?.daily_prediction?.prediction ||
        data?.data?.prediction?.description ||
        data?.prediction ||
        data?.description ||
        JSON.stringify(data?.data ?? data);
      this.horoscopeText = text;
      this.horoscopeStatus = 'idle';
      this.horoscopeLanguage = 'en';
      this.horoscopeTextTranslated = '';

      // Cache the horoscope
      this.setCachedHoroscope(sign, text);

      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Horoscope fetch failed', err);
      if ((err as any)?.name === 'AbortError') {
        this.horoscopeText = 'Horoskop trenutno nije dostupan (timeout).';
      } else {
        this.horoscopeText = 'Horoskop trenutno nije dostupan.';
      }
      this.horoscopeStatus = 'error';
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  private async fetchWeatherSummary() {
    if (!this.userData?.weatherSettings) return;

    try {
      const settings = this.userData.weatherSettings;

      // First try to get cached weather data (no API call)
      let weatherData = this.weatherService.getWeatherFromCache();

      // If no cached data, fetch from API (this happens on login/register)
      if (!weatherData) {
        weatherData = await this.weatherService.fetchWeather(
          settings.latitude,
          settings.longitude,
          settings.city,
          settings.country
        );
      }

      if (weatherData) {
        const temp = this.weatherService.convertTemperature(
          weatherData.current.temperature,
          settings.temperatureUnit
        );
        const unit = settings.temperatureUnit === 'fahrenheit' ? '°F' : '°C';
        const description = this.weatherService.getWeatherDescription(
          weatherData.current.weatherCode
        );
        const icon = this.weatherService.getWeatherIcon(
          weatherData.current.weatherCode,
          weatherData.current.isDay
        );

        this.weatherSummary = `${icon} U ${
          settings.city
        } je trenutno ${description.toLowerCase()}, ${temp}${unit}.`;

        if (!(this.cdr as any)?.destroyed) {
          this.cdr.detectChanges();
        }
      }
    } catch (err) {
      console.error('Weather summary fetch failed:', err);
    }
  }

  async openTraitInsight(trait: string) {
    if (!this.userData || !this.zodiacInfo) return;

    this.insightOpen = true;
    this.insightStatus = 'loading';
    this.insightText = '';
    this.loadingMessageIndex = Math.floor(Math.random() * this.loadingMessages.length);
    this.startLoadingMessageTicker();

    try {
      const payload = {
        name: this.userData.ime,
        sign: this.zodiacInfo.name,
        traits: [trait],
        horoscopeText: this.horoscopeText,
        dateString: this.userData.datumRodjenja,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/traits-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('API error');

      // Track traits-insight API call (uses OpenRouter)
      this.apiStatsService.incrementApiCall('openRouter');

      const data = await res.json();
      this.insightText = data?.insight || 'Nema dodatnih informacija.';
      this.insightStatus = 'idle';
      this.stopLoadingMessageTicker();
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Trait insight failed', err);
      this.insightStatus = 'error';
      this.insightText = 'Nije moguće dobiti dodatne informacije trenutno.';
      this.stopLoadingMessageTicker();
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    }
  }

  closeInsight() {
    this.insightOpen = false;
    this.insightText = '';
    this.insightStatus = 'idle';
    this.stopLoadingMessageTicker();
  }

  async toggleHoroscopeLanguage() {
    if (this.horoscopeLanguage === 'en' && !this.horoscopeTextTranslated) {
      // Switching to BS - need to translate
      this.horoscopeTranslating = true;
      try {
        // MyMemory API has 500 character limit per request
        // If text is longer than 495 chars, truncate and add ellipsis
        let textToTranslate = this.horoscopeText;
        const maxChars = 495;
        const isTruncated = textToTranslate.length > maxChars;

        if (isTruncated) {
          textToTranslate = textToTranslate.substring(0, maxChars) + '...';
        }

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToTranslate,
            targetLang: 'bs',
          }),
        });
        if (!res.ok) throw new Error('Translation failed');

        // Track MyMemory API call
        this.apiStatsService.incrementApiCall('myMemory');

        const data = await res.json();
        this.horoscopeTextTranslated = data?.translatedText || this.horoscopeText;

        // Update cache with translation
        if (this.zodiacInfo) {
          const sign = this.mapToEnglishSign(this.zodiacInfo.name);
          if (sign) {
            this.setCachedHoroscope(sign, this.horoscopeText, this.horoscopeTextTranslated);
          }
        }
      } catch (err) {
        console.error('Translation error:', err);
        this.horoscopeTextTranslated = this.horoscopeText;
      } finally {
        this.horoscopeTranslating = false;
      }
    }
    this.horoscopeLanguage = this.horoscopeLanguage === 'en' ? 'bs' : 'en';
    if (!(this.cdr as any)?.destroyed) {
      this.cdr.detectChanges();
    }
  }

  private startLoadingMessageTicker() {
    this.stopLoadingMessageTicker();
    this.loadingMessageInterval = setInterval(() => {
      this.loadingMessageIndex = (this.loadingMessageIndex + 1) % this.loadingMessages.length;
      if (!(this.cdr as any)?.destroyed) {
        this.cdr.detectChanges();
      }
    }, 1800);
  }

  private stopLoadingMessageTicker() {
    if (this.loadingMessageInterval) {
      clearInterval(this.loadingMessageInterval);
      this.loadingMessageInterval = null;
    }
  }

  private pickRandom(arr: string[], count: number): string[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  triggerThemeRain() {
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

  ngOnDestroy() {
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
    }
    if (this.triviaInterval) {
      clearInterval(this.triviaInterval);
    }

    // Reset to default theme and background when leaving dashboard
    if (typeof document !== 'undefined') {
      // Reset CSS variables
      const root = document.documentElement;
      root.style.setProperty('--color-primary', '#345aaa');
      root.style.setProperty('--color-secondary', '#2a4a8a');
      root.style.setProperty('--color-accent', '#ff9800');
      root.style.setProperty('--color-background', '#f5f5f5');
      root.style.setProperty('--color-surface', '#ffffff');
      root.style.setProperty('--color-text', '#333333');
      root.style.setProperty('--color-textSecondary', '#666666');

      // Reset background
      document.body.style.background =
        'linear-gradient(135deg, #e8f0f7 0%, #d4e3f0 50%, #c5d9ed 100%)';
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  getCurrentDescription(): string {
    if (!this.currentTheme) return '';
    return this.currentTheme.descriptions[this.descriptionIndex];
  }

  // Pomodoro helper methods
  isPomodoroBlocking(): boolean {
    return this.pomodoroService.isBlocking();
  }

  formatPomodoroTime(): string {
    if (!this.pomodoroSession) return '00:00';
    return this.pomodoroService.formatTime(this.pomodoroSession.remainingSeconds);
  }

  getPomodoroStateLabel(): string {
    if (!this.pomodoroSession) return '';
    switch (this.pomodoroSession.state) {
      case 'countdown':
        return 'Priprema...';
      case 'focus':
        return '🎯 Fokus vrijeme';
      case 'break':
        return '☕ Pauza';
      default:
        return '';
    }
  }

  // Daily trivia - now loaded from separate file (see daily-trivia.ts)
  private updateDailyTrivia(): void {
    const gender = this.userData?.spol;
    this.dailyTrivia = getRandomTriviaForGender(gender);
    this.cdr.detectChanges();
  }

  formatDate(timestamp: Timestamp): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  private determineZodiac(dateString: string): ZodiacInfo | null {
    if (!dateString) return null;

    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getTime())) return null;

    const mmdd = (parsedDate.getUTCMonth() + 1) * 100 + parsedDate.getUTCDate();
    const isFemale = this.userData?.spol === 'zensko';

    const signs: ZodiacInfo[] = [
      {
        name: 'Jarac',
        nameFemale: 'Jarac',
        emoji: '🐐',
        dateRange: '22. dec - 19. jan',
        start: 1222,
        end: 119,
        description: 'Prizemljen, disciplinovan i strpljiv – uvijek gradi dugoročne temelje.',
        descriptionFemale:
          'Prizemljena, disciplinovana i strpljiva – uvijek gradi dugoročne temelje.',
        highlights: this.pickRandom(
          [
            'Strpljenje',
            'Dugoročna vizija',
            'Stabilnost',
            'Ambicija',
            'Odgovornost',
            'Upornost',
            'Mudrost',
            'Realizam',
            'Fokus na cilj',
            'Samodisciplina',
          ],
          3
        ),
      },
      {
        name: 'Vodolija',
        nameFemale: 'Vodolija',
        emoji: '🌊',
        dateRange: '20. jan - 18. feb',
        start: 120,
        end: 218,
        description:
          'Originalan, humanista i uvijek korak ispred sa idejama koje mijenjaju pravila.',
        descriptionFemale:
          'Originalna, humanista i uvijek korak ispred sa idejama koje mijenjaju pravila.',
        highlights: this.pickRandom(
          [
            'Kreativnost',
            'Humanost',
            'Futuristički pogled',
            'Inovacija',
            'Nezavisnost',
            'Originalnost',
            'Vizionarstvo',
            'Altruizam',
            'Intelekt',
            'Ekscentričnost',
          ],
          3
        ),
      },
      {
        name: 'Ribe',
        nameFemale: 'Riba',
        emoji: '🐟',
        dateRange: '19. feb - 20. mar',
        start: 219,
        end: 320,
        description: 'Empatične, intuitivne i inspirativne – osjete atmosferu prije drugih.',
        descriptionFemale: 'Empatična, intuitivna i inspirativna – osjeti atmosferu prije drugih.',
        highlights: this.pickRandom(
          [
            'Empatija',
            'Intuicija',
            'Inspiracija',
            'Maštovitost',
            'Saosjećanje',
            'Umjetnička duša',
            'Duhovnost',
            'Romantičnost',
            'Adaptibilnost',
            'Nježnost',
          ],
          3
        ),
      },
      {
        name: 'Ovan',
        nameFemale: 'Ovnica',
        emoji: '🔥',
        dateRange: '21. mar - 19. apr',
        start: 321,
        end: 419,
        description: 'Odvažan starter, puni energiju timu i vodi prvi korak u novom projektu.',
        descriptionFemale:
          'Odvažna starterica, puni energiju timu i vodi prvi korak u novom projektu.',
        highlights: this.pickRandom(
          [
            'Hrabar početak',
            'Visoka energija',
            'Liderstvo',
            'Odlučnost',
            'Entuzijazam',
            'Pionirski duh',
            'Direktnost',
            'Takmičarski duh',
            'Spontanost',
            'Akcija',
          ],
          3
        ),
      },
      {
        name: 'Bik',
        nameFemale: 'Bikica',
        emoji: '🌿',
        dateRange: '20. apr - 20. maj',
        start: 420,
        end: 520,
        description: 'Pouzdan, praktičan i voli komfor – pretvara ideje u stabilnu rutinu.',
        descriptionFemale: 'Pouzdana, praktična i voli komfor – pretvara ideje u stabilnu rutinu.',
        highlights: this.pickRandom(
          [
            'Pouzdanost',
            'Strpljenje',
            'Praktičnost',
            'Upornost',
            'Senzualnost',
            'Lojalnost',
            'Materijalizam',
            'Stabilnost',
            'Uživanje',
            'Tvrdoglavost',
          ],
          3
        ),
      },
      {
        name: 'Blizanci',
        nameFemale: 'Blizanka',
        emoji: '💨',
        dateRange: '21. maj - 20. jun',
        start: 521,
        end: 620,
        description: 'Brzi um, radoznalost na maksimumu i sjajna komunikacija.',
        descriptionFemale: 'Brzi um, radoznalost na maksimumu i sjajna komunikacija.',
        highlights: this.pickRandom(
          [
            'Radoznalost',
            'Komunikacija',
            'Fleksibilnost',
            'Duhovitost',
            'Versatilnost',
            'Živahnost',
            'Intelekt',
            'Socijabilnost',
            'Brzi um',
            'Šarm',
          ],
          3
        ),
      },
      {
        name: 'Rak',
        nameFemale: 'Rakica',
        emoji: '🌙',
        dateRange: '21. jun - 22. jul',
        start: 621,
        end: 722,
        description: 'Zaštitnički nastrojen, intuitivan i brižan – stvara siguran prostor.',
        descriptionFemale: 'Zaštitnica, intuitivna i brižna – stvara siguran prostor.',
        highlights: this.pickRandom(
          [
            'Intuicija',
            'Briga o drugima',
            'Emocionalna mudrost',
            'Zaštitništvo',
            'Nostalgija',
            'Porodičnost',
            'Osjetljivost',
            'Lojalnost',
            'Imaginacija',
            'Nježnost',
          ],
          3
        ),
      },
      {
        name: 'Lav',
        nameFemale: 'Lavica',
        emoji: '🦁',
        dateRange: '23. jul - 22. aug',
        start: 723,
        end: 822,
        description: 'Magnetičan i kreativan, unosi toplinu i samopouzdanje gdje god se pojavi.',
        descriptionFemale:
          'Magnetična i kreativna, unosi toplinu i samopouzdanje gdje god se pojavi.',
        highlights: this.pickRandom(
          [
            'Kreativnost',
            'Karizma',
            'Samopouzdanje',
            'Velikodušnost',
            'Dramski talent',
            'Liderstvo',
            'Toplina',
            'Ponos',
            'Entuzijazam',
            'Lojalnost',
          ],
          3
        ),
      },
      {
        name: 'Djevica',
        nameFemale: 'Djevica',
        emoji: '🌾',
        dateRange: '23. aug - 22. sep',
        start: 823,
        end: 922,
        description: 'Detaljna, analitična i praktična – primjećuje nijanse koje drugi propuštaju.',
        descriptionFemale:
          'Detaljna, analitična i praktična – primjećuje nijanse koje drugi propuštaju.',
        highlights: this.pickRandom(
          [
            'Preciznost',
            'Organizacija',
            'Praktični savjeti',
            'Analitičnost',
            'Marljivost',
            'Skromnost',
            'Pomoćnost',
            'Savršenstvo',
            'Kritičko mišljenje',
            'Pouzdanost',
          ],
          3
        ),
      },
      {
        name: 'Vaga',
        nameFemale: 'Vaga',
        emoji: '⚖️',
        dateRange: '23. sep - 22. okt',
        start: 923,
        end: 1022,
        description: 'Traži balans, donosi eleganciju i diplomatično rješava nesuglasice.',
        descriptionFemale: 'Traži balans, donosi eleganciju i diplomatično rješava nesuglasice.',
        highlights: this.pickRandom(
          [
            'Diplomatija',
            'Balans',
            'Estetika',
            'Harmonija',
            'Pravednost',
            'Šarm',
            'Kooperativnost',
            'Romantičnost',
            'Izbirljivost',
            'Elegancija',
          ],
          3
        ),
      },
      {
        name: 'Škorpija',
        nameFemale: 'Škorpija',
        emoji: '🦂',
        dateRange: '23. okt - 21. nov',
        start: 1023,
        end: 1121,
        description: 'Intenzivan, lojalan i strateški – duboko fokusiran na suštinu.',
        descriptionFemale: 'Intenzivna, lojalna i strateška – duboko fokusirana na suštinu.',
        highlights: this.pickRandom(
          [
            'Fokus',
            'Lojalnost',
            'Duboka intuicija',
            'Intenzitet',
            'Strast',
            'Misterija',
            'Transformacija',
            'Odlučnost',
            'Istraživalački duh',
            'Hrabrost',
          ],
          3
        ),
      },
      {
        name: 'Strijelac',
        nameFemale: 'Strijelčica',
        emoji: '🏹',
        dateRange: '22. nov - 21. dec',
        start: 1122,
        end: 1221,
        description: 'Optimističan istraživač, voli slobodu, učenje i velika pitanja.',
        descriptionFemale: 'Optimistična istraživačica, voli slobodu, učenje i velika pitanja.',
        highlights: this.pickRandom(
          [
            'Optimističan duh',
            'Istraživanje',
            'Široka perspektiva',
            'Slobodoljubivost',
            'Filozofija',
            'Avanturizam',
            'Iskrenost',
            'Velikodušnost',
            'Znatiželja',
            'Humor',
          ],
          3
        ),
      },
    ];

    const match = signs.find((sign) => {
      if (sign.start <= sign.end) {
        return mmdd >= sign.start && mmdd <= sign.end;
      }
      // Wrap around new year (e.g. Jarac)
      return mmdd >= sign.start || mmdd <= sign.end;
    });

    if (match && isFemale) {
      // Return version with female name and description
      return {
        ...match,
        name: match.nameFemale,
        description: match.descriptionFemale,
      };
    }

    return match || null;
  }
}

interface ZodiacInfo {
  name: string;
  nameFemale: string;
  emoji: string;
  dateRange: string;
  start: number;
  end: number;
  description: string;
  descriptionFemale: string;
  highlights: string[];
}
