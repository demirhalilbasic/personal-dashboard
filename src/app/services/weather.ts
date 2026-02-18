import { Injectable, signal, inject } from '@angular/core';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from '../firebase.config';
import { ApiStatsService } from './api-stats';

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
    precipitation: number;
    cloudCover: number;
    uvIndex: number;
    visibility: number;
    pressure: number;
  };
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  location: {
    city: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  lastUpdated: Date;
}

export interface HourlyForecast {
  time: Date;
  temperature: number;
  weatherCode: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
}

export interface DailyForecast {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitation: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  windSpeedMax: number;
}

export interface UserWeatherSettings {
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  windSpeedUnit: 'kmh' | 'mph' | 'ms';
}

// Popular cities in Bosnia and Herzegovina and surrounding region
export const POPULAR_CITIES = [
  { city: 'Sarajevo', country: 'Bosna i Hercegovina', latitude: 43.8563, longitude: 18.4131 },
  { city: 'Banja Luka', country: 'Bosna i Hercegovina', latitude: 44.7722, longitude: 17.191 },
  { city: 'Tuzla', country: 'Bosna i Hercegovina', latitude: 44.5384, longitude: 18.6763 },
  { city: 'Zenica', country: 'Bosna i Hercegovina', latitude: 44.2017, longitude: 17.9076 },
  { city: 'Mostar', country: 'Bosna i Hercegovina', latitude: 43.3438, longitude: 17.8078 },
  { city: 'Bihać', country: 'Bosna i Hercegovina', latitude: 44.8169, longitude: 15.8697 },
  { city: 'Brčko', country: 'Bosna i Hercegovina', latitude: 44.8726, longitude: 18.8096 },
  { city: 'Bijeljina', country: 'Bosna i Hercegovina', latitude: 44.7586, longitude: 19.2145 },
  { city: 'Prijedor', country: 'Bosna i Hercegovina', latitude: 44.9798, longitude: 16.7136 },
  { city: 'Trebinje', country: 'Bosna i Hercegovina', latitude: 42.7117, longitude: 18.3434 },
  { city: 'Zagreb', country: 'Hrvatska', latitude: 45.815, longitude: 15.9819 },
  { city: 'Beograd', country: 'Srbija', latitude: 44.7866, longitude: 20.4489 },
  { city: 'Ljubljana', country: 'Slovenija', latitude: 46.0569, longitude: 14.5058 },
  { city: 'Beč', country: 'Austrija', latitude: 48.2082, longitude: 16.3738 },
  { city: 'München', country: 'Njemačka', latitude: 48.1351, longitude: 11.582 },
  { city: 'Berlin', country: 'Njemačka', latitude: 52.52, longitude: 13.405 },
  { city: 'Pariz', country: 'Francuska', latitude: 48.8566, longitude: 2.3522 },
  { city: 'London', country: 'Ujedinjeno Kraljevstvo', latitude: 51.5074, longitude: -0.1278 },
  { city: 'New York', country: 'SAD', latitude: 40.7128, longitude: -74.006 },
  { city: 'Dubai', country: 'UAE', latitude: 25.2048, longitude: 55.2708 },
];

// WMO Weather interpretation codes
export const WEATHER_CODES: Record<
  number,
  { description: string; icon: string; iconNight: string }
> = {
  0: { description: 'Vedro', icon: '☀️', iconNight: '🌙' },
  1: { description: 'Pretežno vedro', icon: '🌤️', iconNight: '🌙' },
  2: { description: 'Djelimično oblačno', icon: '⛅', iconNight: '☁️' },
  3: { description: 'Oblačno', icon: '☁️', iconNight: '☁️' },
  45: { description: 'Magla', icon: '🌫️', iconNight: '🌫️' },
  48: { description: 'Ledena magla', icon: '🌫️', iconNight: '🌫️' },
  51: { description: 'Slaba rosulja', icon: '🌧️', iconNight: '🌧️' },
  53: { description: 'Umjerena rosulja', icon: '🌧️', iconNight: '🌧️' },
  55: { description: 'Jaka rosulja', icon: '🌧️', iconNight: '🌧️' },
  56: { description: 'Ledena rosulja', icon: '🌧️', iconNight: '🌧️' },
  57: { description: 'Jaka ledena rosulja', icon: '🌧️', iconNight: '🌧️' },
  61: { description: 'Slaba kiša', icon: '🌧️', iconNight: '🌧️' },
  63: { description: 'Umjerena kiša', icon: '🌧️', iconNight: '🌧️' },
  65: { description: 'Jaka kiša', icon: '🌧️', iconNight: '🌧️' },
  66: { description: 'Ledena kiša', icon: '🌧️', iconNight: '🌧️' },
  67: { description: 'Jaka ledena kiša', icon: '🌧️', iconNight: '🌧️' },
  71: { description: 'Slab snijeg', icon: '🌨️', iconNight: '🌨️' },
  73: { description: 'Umjeren snijeg', icon: '🌨️', iconNight: '🌨️' },
  75: { description: 'Jak snijeg', icon: '❄️', iconNight: '❄️' },
  77: { description: 'Snježna zrna', icon: '🌨️', iconNight: '🌨️' },
  80: { description: 'Slabi pljuskovi', icon: '🌦️', iconNight: '🌧️' },
  81: { description: 'Umjereni pljuskovi', icon: '🌦️', iconNight: '🌧️' },
  82: { description: 'Jaki pljuskovi', icon: '⛈️', iconNight: '⛈️' },
  85: { description: 'Slabi snježni pljuskovi', icon: '🌨️', iconNight: '🌨️' },
  86: { description: 'Jaki snježni pljuskovi', icon: '🌨️', iconNight: '🌨️' },
  95: { description: 'Grmljavina', icon: '⛈️', iconNight: '⛈️' },
  96: { description: 'Grmljavina sa slabom tučom', icon: '⛈️', iconNight: '⛈️' },
  99: { description: 'Grmljavina sa jakom tučom', icon: '⛈️', iconNight: '⛈️' },
};

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private apiStatsService = inject(ApiStatsService);

  private weatherData = signal<WeatherData | null>(null);
  private isLoading = signal<boolean>(false);
  private error = signal<string | null>(null);

  private readonly BASE_URL = 'https://api.open-meteo.com/v1/forecast';
  private readonly GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  private readonly CACHE_KEY = 'weather_cache';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minuta u ms

  // Cache management methods
  private getCachedWeather(): WeatherData | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid (within 30 minutes)
      if (now - timestamp < this.CACHE_DURATION) {
        // Restore Date objects
        data.lastUpdated = new Date(data.lastUpdated);
        data.hourly = data.hourly.map((h: any) => ({ ...h, time: new Date(h.time) }));
        data.daily = data.daily.map((d: any) => ({ ...d, date: new Date(d.date) }));
        return data;
      }

      // Cache expired
      localStorage.removeItem(this.CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Failed to read weather cache:', err);
      return null;
    }
  }

  private setCachedWeather(data: WeatherData): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Failed to cache weather data:', err);
    }
  }

  clearWeatherCache(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Get weather from cache (no API call)
  getWeatherFromCache(): WeatherData | null {
    return this.getCachedWeather();
  }

  getWeatherData() {
    return this.weatherData();
  }

  getIsLoading() {
    return this.isLoading();
  }

  getError() {
    return this.error();
  }

  getWeatherIcon(code: number, isDay: boolean = true): string {
    const info = WEATHER_CODES[code] || WEATHER_CODES[0];
    return isDay ? info.icon : info.iconNight;
  }

  getWeatherDescription(code: number): string {
    return WEATHER_CODES[code]?.description || 'Nepoznato';
  }

  async searchCities(
    query: string
  ): Promise<Array<{ city: string; country: string; latitude: number; longitude: number }>> {
    if (!query || query.length < 2) return [];

    try {
      const response = await fetch(
        `${this.GEOCODING_URL}?name=${encodeURIComponent(query)}&count=10&language=hr&format=json`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (!data.results) return [];

      return data.results.map((r: any) => ({
        city: r.name,
        country: r.country || '',
        latitude: r.latitude,
        longitude: r.longitude,
      }));
    } catch (err) {
      console.error('City search failed:', err);
      return [];
    }
  }

  async fetchWeather(
    latitude: number,
    longitude: number,
    city: string,
    country?: string
  ): Promise<WeatherData | null> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'is_day',
          'precipitation',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
          'wind_direction_10m',
          'surface_pressure',
          'uv_index',
          'visibility',
        ].join(','),
        hourly: [
          'temperature_2m',
          'weather_code',
          'precipitation',
          'relative_humidity_2m',
          'wind_speed_10m',
          'is_day',
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'precipitation_probability_max',
          'sunrise',
          'sunset',
          'uv_index_max',
          'wind_speed_10m_max',
        ].join(','),
        timezone: 'auto',
        forecast_days: '7',
      });

      const response = await fetch(`${this.BASE_URL}?${params.toString()}`);

      if (!response.ok) throw new Error('Weather API failed');

      const data = await response.json();

      const weatherData: WeatherData = {
        current: {
          temperature: data.current.temperature_2m,
          feelsLike: data.current.apparent_temperature,
          humidity: data.current.relative_humidity_2m,
          windSpeed: data.current.wind_speed_10m,
          windDirection: data.current.wind_direction_10m,
          weatherCode: data.current.weather_code,
          isDay: data.current.is_day === 1,
          precipitation: data.current.precipitation,
          cloudCover: data.current.cloud_cover,
          uvIndex: data.current.uv_index || 0,
          visibility: (data.current.visibility || 10000) / 1000, // Convert to km
          pressure: data.current.surface_pressure,
        },
        hourly: this.parseHourlyData(data.hourly),
        daily: this.parseDailyData(data.daily),
        location: {
          city,
          country: country || '',
          latitude,
          longitude,
          timezone: data.timezone,
        },
        lastUpdated: new Date(),
      };

      this.weatherData.set(weatherData);

      // Cache the weather data locally
      this.setCachedWeather(weatherData);

      // Increment API call counter (new monthly tracking)
      await this.apiStatsService.incrementApiCall('openMeteo');

      return weatherData;
    } catch (err: any) {
      console.error('Weather fetch failed:', err);
      this.error.set('Nije moguće učitati vremenske podatke');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  // Get current API call count for openMeteo (uses new monthly tracking)
  async getApiCallCount(): Promise<number> {
    return this.apiStatsService.getCategoryCount('openMeteo');
  }

  private parseHourlyData(hourly: any): HourlyForecast[] {
    const result: HourlyForecast[] = [];
    const now = new Date();

    for (let i = 0; i < hourly.time.length && result.length < 24; i++) {
      const time = new Date(hourly.time[i]);
      if (time < now) continue; // Skip past hours

      result.push({
        time,
        temperature: hourly.temperature_2m[i],
        weatherCode: hourly.weather_code[i],
        precipitation: hourly.precipitation[i],
        humidity: hourly.relative_humidity_2m[i],
        windSpeed: hourly.wind_speed_10m[i],
        isDay: hourly.is_day[i] === 1,
      });
    }

    return result;
  }

  private parseDailyData(daily: any): DailyForecast[] {
    const result: DailyForecast[] = [];

    for (let i = 0; i < daily.time.length; i++) {
      result.push({
        date: new Date(daily.time[i]),
        tempMax: daily.temperature_2m_max[i],
        tempMin: daily.temperature_2m_min[i],
        weatherCode: daily.weather_code[i],
        precipitation: daily.precipitation_sum[i],
        precipitationProbability: daily.precipitation_probability_max[i] || 0,
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        uvIndexMax: daily.uv_index_max[i] || 0,
        windSpeedMax: daily.wind_speed_10m_max[i],
      });
    }

    return result;
  }

  convertTemperature(celsius: number, unit: 'celsius' | 'fahrenheit'): number {
    if (unit === 'fahrenheit') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  }

  convertWindSpeed(kmh: number, unit: 'kmh' | 'mph' | 'ms'): number {
    switch (unit) {
      case 'mph':
        return Math.round(kmh * 0.621371);
      case 'ms':
        return Math.round((kmh / 3.6) * 10) / 10;
      default:
        return Math.round(kmh);
    }
  }

  getWindSpeedLabel(unit: 'kmh' | 'mph' | 'ms'): string {
    switch (unit) {
      case 'mph':
        return 'mph';
      case 'ms':
        return 'm/s';
      default:
        return 'km/h';
    }
  }

  getTemperatureLabel(unit: 'celsius' | 'fahrenheit'): string {
    return unit === 'fahrenheit' ? '°F' : '°C';
  }

  getWindDirectionLabel(degrees: number): string {
    const directions = ['S', 'SZ', 'Z', 'JZ', 'J', 'JI', 'I', 'SI'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  }

  getUVIndexLevel(uvIndex: number): { level: string; color: string } {
    if (uvIndex <= 2) return { level: 'Nizak', color: '#4caf50' };
    if (uvIndex <= 5) return { level: 'Umjeren', color: '#ffeb3b' };
    if (uvIndex <= 7) return { level: 'Visok', color: '#ff9800' };
    if (uvIndex <= 10) return { level: 'Vrlo visok', color: '#f44336' };
    return { level: 'Ekstremno', color: '#9c27b0' };
  }

  getDayName(date: Date, short: boolean = false): string {
    const days = short
      ? ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']
      : ['Nedjelja', 'Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota'];
    return days[date.getDay()];
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  }

  // User settings management
  async getUserWeatherSettings(uid: string): Promise<UserWeatherSettings | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data['weatherSettings']) {
          return data['weatherSettings'] as UserWeatherSettings;
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to get weather settings:', err);
      return null;
    }
  }

  async saveUserWeatherSettings(uid: string, settings: UserWeatherSettings): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        weatherSettings: settings,
      });
    } catch (err) {
      console.error('Failed to save weather settings:', err);
      throw new Error('Nije moguće sačuvati postavke vremena');
    }
  }

  // Get background gradient based on weather and time
  getWeatherBackground(weatherCode: number, isDay: boolean): string {
    // Clear sky
    if (weatherCode === 0) {
      return isDay
        ? 'linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)'
        : 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    }

    // Partly cloudy
    if (weatherCode <= 3) {
      return isDay
        ? 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)'
        : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)';
    }

    // Fog
    if (weatherCode === 45 || weatherCode === 48) {
      return 'linear-gradient(135deg, #bdc3c7 0%, #2c3e50 100%)';
    }

    // Rain/Drizzle
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) {
      return 'linear-gradient(135deg, #616161 0%, #9bc5c3 100%)';
    }

    // Snow
    if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) {
      return 'linear-gradient(135deg, #E6DADA 0%, #274046 100%)';
    }

    // Thunderstorm
    if (weatherCode >= 95) {
      return 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
    }

    // Default
    return isDay
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #232526 0%, #414345 100%)';
  }

  // Get animated CSS class based on weather
  getWeatherAnimationClass(weatherCode: number): string {
    if (weatherCode === 0 || weatherCode === 1) return 'weather-sunny';
    if (weatherCode <= 3) return 'weather-cloudy';
    if (weatherCode === 45 || weatherCode === 48) return 'weather-foggy';
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82))
      return 'weather-rainy';
    if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86))
      return 'weather-snowy';
    if (weatherCode >= 95) return 'weather-stormy';
    return '';
  }
}
