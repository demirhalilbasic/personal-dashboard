import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  WeatherService,
  WeatherData,
  UserWeatherSettings,
  POPULAR_CITIES,
  DailyForecast,
  HourlyForecast,
} from '../../services/weather';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weather-widget.html',
  styleUrl: './weather-widget.css',
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  weatherData: WeatherData | null = null;
  settings: UserWeatherSettings | null = null;
  isLoading = false;
  error: string | null = null;

  // UI state
  showSettings = false;
  showHourly = true;
  showDaily = false;
  citySearchQuery = '';
  citySearchResults: Array<{ city: string; country: string; latitude: number; longitude: number }> =
    [];
  isSearching = false;

  // Settings form
  selectedCity: { city: string; country: string; latitude: number; longitude: number } | null =
    null;
  temperatureUnit: 'celsius' | 'fahrenheit' = 'celsius';
  windSpeedUnit: 'kmh' | 'mph' | 'ms' = 'kmh';

  popularCities = POPULAR_CITIES;

  private refreshInterval: any;
  private searchTimeout: any;

  constructor(
    private weatherService: WeatherService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadWeatherSettings();

    // Refresh weather every 30 minutes
    this.refreshInterval = setInterval(() => {
      this.refreshWeather();
    }, 30 * 60 * 1000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  private async loadWeatherSettings() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isLoading = true;

    try {
      // Load user's weather settings
      const settings = await this.weatherService.getUserWeatherSettings(user.uid);

      if (settings) {
        this.settings = settings;
        this.temperatureUnit = settings.temperatureUnit;
        this.windSpeedUnit = settings.windSpeedUnit;
        this.selectedCity = {
          city: settings.city,
          country: settings.country || '',
          latitude: settings.latitude,
          longitude: settings.longitude,
        };

        // First try to load from cache (no API call)
        const cachedWeather = this.weatherService.getWeatherFromCache();
        if (cachedWeather) {
          this.weatherData = cachedWeather;
          this.isLoading = false;
          this.cdr.detectChanges();
        } else {
          // No cache - fetch from API (login/register scenario)
          await this.fetchWeather();
        }
      } else {
        // No settings - show settings panel for first-time setup
        this.showSettings = true;
        this.isLoading = false;
      }
    } catch (err) {
      console.error('Failed to load weather settings:', err);
      this.error = 'Nije moguće učitati postavke vremena';
      this.isLoading = false;
    }
  }

  async fetchWeather() {
    if (!this.selectedCity) return;

    this.isLoading = true;
    this.error = null;

    try {
      this.weatherData = await this.weatherService.fetchWeather(
        this.selectedCity.latitude,
        this.selectedCity.longitude,
        this.selectedCity.city,
        this.selectedCity.country
      );
    } catch (err) {
      this.error = 'Nije moguće učitati vremenske podatke';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Refresh always calls API (user clicked refresh button)
  async refreshWeather() {
    if (this.selectedCity) {
      // Clear cache to force fresh API call
      this.weatherService.clearWeatherCache();
      await this.fetchWeather();
    }
  }

  async searchCities() {
    if (this.citySearchQuery.length < 2) {
      this.citySearchResults = [];
      return;
    }

    // Debounce search
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(async () => {
      this.isSearching = true;
      this.citySearchResults = await this.weatherService.searchCities(this.citySearchQuery);
      this.isSearching = false;
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

  async saveSettings() {
    if (!this.selectedCity) return;

    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isLoading = true;

    try {
      const newSettings: UserWeatherSettings = {
        city: this.selectedCity.city,
        country: this.selectedCity.country,
        latitude: this.selectedCity.latitude,
        longitude: this.selectedCity.longitude,
        temperatureUnit: this.temperatureUnit,
        windSpeedUnit: this.windSpeedUnit,
      };

      await this.weatherService.saveUserWeatherSettings(user.uid, newSettings);
      this.settings = newSettings;

      // Clear cache and fetch fresh weather for new city/settings
      this.weatherService.clearWeatherCache();
      await this.fetchWeather();

      this.showSettings = false;
    } catch (err) {
      this.error = 'Nije moguće sačuvati postavke';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  cancelSettings() {
    this.showSettings = false;
    // Reset to saved settings
    if (this.settings) {
      this.selectedCity = {
        city: this.settings.city,
        country: this.settings.country || '',
        latitude: this.settings.latitude,
        longitude: this.settings.longitude,
      };
      this.temperatureUnit = this.settings.temperatureUnit;
      this.windSpeedUnit = this.settings.windSpeedUnit;
    }
  }

  openSettings() {
    this.showSettings = true;
  }

  // Helper methods
  getTemperature(celsius: number): number {
    return this.weatherService.convertTemperature(celsius, this.temperatureUnit);
  }

  getTemperatureUnit(): string {
    return this.weatherService.getTemperatureLabel(this.temperatureUnit);
  }

  getWindSpeed(kmh: number): number {
    return this.weatherService.convertWindSpeed(kmh, this.windSpeedUnit);
  }

  getWindSpeedLabel(): string {
    return this.weatherService.getWindSpeedLabel(this.windSpeedUnit);
  }

  getWeatherIcon(code: number, isDay: boolean = true): string {
    return this.weatherService.getWeatherIcon(code, isDay);
  }

  getWeatherDescription(code: number): string {
    return this.weatherService.getWeatherDescription(code);
  }

  getWindDirection(degrees: number): string {
    return this.weatherService.getWindDirectionLabel(degrees);
  }

  getUVInfo(uvIndex: number): { level: string; color: string } {
    return this.weatherService.getUVIndexLevel(uvIndex);
  }

  getDayName(date: Date, short: boolean = false): string {
    return this.weatherService.getDayName(date, short);
  }

  formatTime(date: Date): string {
    return this.weatherService.formatTime(date);
  }

  formatSunTime(timeString: string): string {
    const date = new Date(timeString);
    return this.formatTime(date);
  }

  getBackground(): string {
    if (!this.weatherData) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    return this.weatherService.getWeatherBackground(
      this.weatherData.current.weatherCode,
      this.weatherData.current.isDay
    );
  }

  getAnimationClass(): string {
    if (!this.weatherData) return '';
    return this.weatherService.getWeatherAnimationClass(this.weatherData.current.weatherCode);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  get next6Hours(): HourlyForecast[] {
    return this.weatherData?.hourly.slice(0, 6) || [];
  }

  get next7Days(): DailyForecast[] {
    return this.weatherData?.daily || [];
  }

  toggleView(view: 'hourly' | 'daily') {
    if (view === 'hourly') {
      this.showHourly = true;
      this.showDaily = false;
    } else {
      this.showHourly = false;
      this.showDaily = true;
    }
  }
}
