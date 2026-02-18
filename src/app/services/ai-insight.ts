import { Injectable, signal, inject } from '@angular/core';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase.config';
import { AuthService, UserData } from './auth';
import { WeatherService, WeatherData } from './weather';
import { TrackerService, TrackerEntry } from './tracker';
import { ApiStatsService } from './api-stats';

export interface AirQualityData {
  pm25: number;
  pm10: number;
  carbonMonoxide: number;
  nitrogenDioxide: number;
  ozone: number;
  europeanAqi: number;
  usAqi: number;
  aqiLevel: string;
  aqiColor: string;
  lastUpdated: Date;
}

export interface TrackerSummary {
  trackerId: string;
  trackerName: string;
  trackerIcon: string;
  entriesLast7Days: number;
  completionRate: number;
  trend: 'up' | 'down' | 'stable';
  latestData: any;
  averageData?: any;
}

export interface HealthMetrics {
  sleepAverage: number;
  sleepQualityAverage: number;
  moodAverage: number;
  stressAverage: number;
  energyAverage: number;
  waterIntakeAverage: number;
  fitnessMinutesTotal: number;
  fitnessSessionsCount: number;
  studyMinutesTotal: number;
  tasksCompletionRate: number;
  screenTimeAverage: number;
}

export interface AIInsightData {
  summary: string;
  healthScore: number;
  recommendations: AIRecommendation[];
  trackerSummaries: TrackerSummary[];
  healthMetrics: HealthMetrics;
  weatherContext: string;
  airQualityContext: string;
  personalizedTips: string[];
  fitnessRecommendation: {
    shouldExercise: boolean;
    reason: string;
    suggestedActivity: string;
  };
  moodTrend: {
    trend: 'improving' | 'declining' | 'stable';
    insight: string;
  };
  generatedAt: Date;
}

export interface AIRecommendation {
  category: 'health' | 'fitness' | 'productivity' | 'wellness' | 'sleep';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class AIInsightService {
  private apiStatsService = inject(ApiStatsService);

  private insightData = signal<AIInsightData | null>(null);
  private isLoading = signal<boolean>(false);
  private error = signal<string | null>(null);

  private readonly AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  private readonly CACHE_KEY = 'ai_insight_cache';
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

  constructor(
    private authService: AuthService,
    private weatherService: WeatherService,
    private trackerService: TrackerService
  ) {}

  getInsightData() {
    return this.insightData();
  }

  getIsLoading() {
    return this.isLoading();
  }

  getError() {
    return this.error();
  }

  // Cache management
  private getCachedInsight(): AIInsightData | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();

      if (now - timestamp < this.CACHE_DURATION) {
        data.generatedAt = new Date(data.generatedAt);
        return data;
      }

      localStorage.removeItem(this.CACHE_KEY);
      return null;
    } catch (err) {
      console.error('Failed to read AI insight cache:', err);
      return null;
    }
  }

  private setCachedInsight(data: AIInsightData): void {
    if (typeof window === 'undefined') return;

    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Failed to cache AI insight:', err);
    }
  }

  clearInsightCache(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CACHE_KEY);
  }

  getInsightFromCache(): AIInsightData | null {
    return this.getCachedInsight();
  }

  // Fetch air quality data
  async fetchAirQuality(latitude: number, longitude: number): Promise<AirQualityData | null> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        current: [
          'pm10',
          'pm2_5',
          'carbon_monoxide',
          'nitrogen_dioxide',
          'ozone',
          'european_aqi',
          'us_aqi',
        ].join(','),
        timezone: 'auto',
      });

      const response = await fetch(`${this.AIR_QUALITY_URL}?${params.toString()}`);

      if (!response.ok) throw new Error('Air quality API failed');

      // Track air quality API call
      await this.apiStatsService.incrementApiCall('airQuality');

      const data = await response.json();

      const usAqi = data.current.us_aqi || 0;
      const { level, color } = this.getAQILevel(usAqi);

      return {
        pm25: data.current.pm2_5 || 0,
        pm10: data.current.pm10 || 0,
        carbonMonoxide: data.current.carbon_monoxide || 0,
        nitrogenDioxide: data.current.nitrogen_dioxide || 0,
        ozone: data.current.ozone || 0,
        europeanAqi: data.current.european_aqi || 0,
        usAqi,
        aqiLevel: level,
        aqiColor: color,
        lastUpdated: new Date(),
      };
    } catch (err) {
      console.error('Air quality fetch failed:', err);
      return null;
    }
  }

  private getAQILevel(aqi: number): { level: string; color: string } {
    if (aqi <= 50) return { level: 'Odličan', color: '#4caf50' };
    if (aqi <= 100) return { level: 'Umjeren', color: '#ffeb3b' };
    if (aqi <= 150) return { level: 'Nezdrav za osjetljive', color: '#ff9800' };
    if (aqi <= 200) return { level: 'Nezdrav', color: '#f44336' };
    if (aqi <= 300) return { level: 'Vrlo nezdrav', color: '#9c27b0' };
    return { level: 'Opasan', color: '#880e4f' };
  }

  // Gather all tracker data for the last 7 days
  async gatherTrackerData(): Promise<{
    summaries: TrackerSummary[];
    metrics: HealthMetrics;
  }> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Korisnik nije prijavljen');

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const startDate = this.formatDate(sevenDaysAgo);
    const endDate = this.formatDate(today);

    let settings;
    try {
      settings = await this.trackerService.getUserSettings();
    } catch {
      settings = { enabledTrackers: [] };
    }

    const summaries: TrackerSummary[] = [];
    const metrics: HealthMetrics = {
      sleepAverage: 0,
      sleepQualityAverage: 0,
      moodAverage: 0,
      stressAverage: 0,
      energyAverage: 0,
      waterIntakeAverage: 0,
      fitnessMinutesTotal: 0,
      fitnessSessionsCount: 0,
      studyMinutesTotal: 0,
      tasksCompletionRate: 0,
      screenTimeAverage: 0,
    };

    // Collect data for each enabled tracker
    for (const trackerId of settings.enabledTrackers) {
      try {
        const entries = await this.trackerService.getTrackerEntriesRange(
          trackerId,
          startDate,
          endDate
        );

        const trackerConfig = this.trackerService.availableTrackers.find((t) => t.id === trackerId);
        if (!trackerConfig) continue;

        const completedEntries = entries.filter((e) => e.completed);
        const completionRate = entries.length > 0 ? (completedEntries.length / 7) * 100 : 0;

        // Calculate trend
        const recentEntries = entries.filter((e) => {
          const entryDate = new Date(e.date);
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          return entryDate >= threeDaysAgo;
        });

        const olderEntries = entries.filter((e) => {
          const entryDate = new Date(e.date);
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(today.getDate() - 3);
          return entryDate < threeDaysAgo;
        });

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentEntries.length > olderEntries.length) trend = 'up';
        else if (recentEntries.length < olderEntries.length) trend = 'down';

        const latestEntry = entries[entries.length - 1];

        summaries.push({
          trackerId,
          trackerName: trackerConfig.name,
          trackerIcon: trackerConfig.icon,
          entriesLast7Days: completedEntries.length,
          completionRate: Math.round(completionRate),
          trend,
          latestData: latestEntry?.data || null,
        });

        // Extract specific metrics
        this.extractMetrics(trackerId, entries, metrics);
      } catch (err) {
        console.error(`Failed to get data for tracker ${trackerId}:`, err);
      }
    }

    return { summaries, metrics };
  }

  private extractMetrics(trackerId: string, entries: TrackerEntry[], metrics: HealthMetrics): void {
    const completedEntries = entries.filter((e) => e.completed);
    if (completedEntries.length === 0) return;

    switch (trackerId) {
      case 'sleep':
        const sleepEntries = completedEntries.filter((e) => e.data?.hoursSlept);
        if (sleepEntries.length > 0) {
          metrics.sleepAverage =
            sleepEntries.reduce((sum, e) => sum + (e.data.hoursSlept || 0), 0) /
            sleepEntries.length;
          metrics.sleepQualityAverage =
            sleepEntries.reduce((sum, e) => sum + (e.data.quality || 0), 0) / sleepEntries.length;
        }
        break;

      case 'mood':
        const moodEntries = completedEntries.filter((e) => e.data?.mood);
        if (moodEntries.length > 0) {
          metrics.moodAverage =
            moodEntries.reduce((sum, e) => sum + (e.data.mood || 0), 0) / moodEntries.length;
          metrics.stressAverage =
            moodEntries.reduce((sum, e) => sum + (e.data.stress || 0), 0) / moodEntries.length;
          metrics.energyAverage =
            moodEntries.reduce((sum, e) => sum + (e.data.energy || 0), 0) / moodEntries.length;
        }
        break;

      case 'water':
        const waterEntries = completedEntries.filter((e) => e.data?.glasses);
        if (waterEntries.length > 0) {
          metrics.waterIntakeAverage =
            waterEntries.reduce((sum, e) => sum + (e.data.glasses || 0), 0) / waterEntries.length;
        }
        break;

      case 'fitness':
        // Fitness tracker saves totalMinutes and exercises array
        const fitnessEntries = completedEntries.filter(
          (e) => e.data?.totalMinutes || e.data?.exercises?.length
        );
        metrics.fitnessSessionsCount = fitnessEntries.length;
        metrics.fitnessMinutesTotal = fitnessEntries.reduce(
          (sum, e) => sum + (e.data.totalMinutes || 0),
          0
        );
        break;

      case 'study':
        // Study tracker saves totalMinutes and sessions array
        const studyEntries = completedEntries.filter(
          (e) => e.data?.totalMinutes || e.data?.sessions?.length
        );
        metrics.studyMinutesTotal = studyEntries.reduce(
          (sum, e) => sum + (e.data.totalMinutes || 0),
          0
        );
        break;

      case 'task':
        const taskEntries = completedEntries.filter((e) => e.data?.completionRate !== undefined);
        if (taskEntries.length > 0) {
          metrics.tasksCompletionRate =
            taskEntries.reduce((sum, e) => sum + (e.data.completionRate || 0), 0) /
            taskEntries.length;
        }
        break;

      case 'screentime':
        const screenEntries = completedEntries.filter((e) => e.data?.totalMinutes);
        if (screenEntries.length > 0) {
          metrics.screenTimeAverage =
            screenEntries.reduce((sum, e) => sum + (e.data.totalMinutes || 0), 0) /
            screenEntries.length;
        }
        break;
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Generate AI insight via API
  async generateInsight(forceRefresh: boolean = false): Promise<AIInsightData | null> {
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = this.getCachedInsight();
      if (cached) {
        this.insightData.set(cached);
        return cached;
      }
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const userData = this.authService.getUserData();
      if (!userData) throw new Error('Korisnik nije prijavljen');

      // Gather all data in parallel
      const [trackerData, weatherData, airQuality] = await Promise.all([
        this.gatherTrackerData(),
        this.getWeatherData(userData),
        this.getAirQualityData(userData),
      ]);

      // Prepare context for AI
      const context = this.buildAIContext(userData, trackerData, weatherData, airQuality);

      // Call AI API
      const response = await fetch('/api/ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context),
      });

      if (!response.ok) {
        throw new Error('AI API failed');
      }

      // Track AI insight API call
      await this.apiStatsService.incrementApiCall('aiInsight');

      const aiResponse = await response.json();

      // Parse AI response and build insight data
      const insightData = this.parseAIResponse(aiResponse, trackerData, weatherData, airQuality);

      this.insightData.set(insightData);
      this.setCachedInsight(insightData);

      return insightData;
    } catch (err: any) {
      console.error('AI insight generation failed:', err);
      this.error.set('Nije moguće generisati AI uvid');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  private async getWeatherData(userData: UserData): Promise<WeatherData | null> {
    if (!userData.weatherSettings) return null;

    // Try cache first
    let weather = this.weatherService.getWeatherFromCache();
    if (!weather) {
      weather = await this.weatherService.fetchWeather(
        userData.weatherSettings.latitude,
        userData.weatherSettings.longitude,
        userData.weatherSettings.city,
        userData.weatherSettings.country
      );
    }
    return weather;
  }

  private async getAirQualityData(userData: UserData): Promise<AirQualityData | null> {
    if (!userData.weatherSettings) return null;

    return this.fetchAirQuality(
      userData.weatherSettings.latitude,
      userData.weatherSettings.longitude
    );
  }

  private buildAIContext(
    userData: UserData,
    trackerData: { summaries: TrackerSummary[]; metrics: HealthMetrics },
    weatherData: WeatherData | null,
    airQuality: AirQualityData | null
  ) {
    return {
      userName: userData.ime,
      userGender: userData.spol, // 'musko' or 'zensko' for personalized responses
      dateOfBirth: userData.datumRodjenja,
      city: userData.weatherSettings?.city || 'Nepoznato',
      trackerSummaries: trackerData.summaries,
      healthMetrics: trackerData.metrics,
      weather: weatherData
        ? {
            temperature: weatherData.current.temperature,
            feelsLike: weatherData.current.feelsLike,
            description: this.weatherService.getWeatherDescription(weatherData.current.weatherCode),
            humidity: weatherData.current.humidity,
            windSpeed: weatherData.current.windSpeed,
            uvIndex: weatherData.current.uvIndex,
            isDay: weatherData.current.isDay,
            weatherCode: weatherData.current.weatherCode,
          }
        : null,
      airQuality: airQuality
        ? {
            usAqi: airQuality.usAqi,
            level: airQuality.aqiLevel,
            pm25: airQuality.pm25,
            pm10: airQuality.pm10,
          }
        : null,
      currentDate: new Date().toISOString(),
      dayOfWeek: new Date().toLocaleDateString('bs-BA', { weekday: 'long' }),
    };
  }

  private parseAIResponse(
    aiResponse: any,
    trackerData: { summaries: TrackerSummary[]; metrics: HealthMetrics },
    weatherData: WeatherData | null,
    airQuality: AirQualityData | null
  ): AIInsightData {
    const content = aiResponse.insight || '';

    // Parse AI response - expecting structured JSON or text
    let parsed: any = {};
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If not JSON, treat as text summary
      parsed.summary = content;
    }

    // Build weather context string
    let weatherContext = '';
    if (weatherData) {
      const desc = this.weatherService.getWeatherDescription(weatherData.current.weatherCode);
      weatherContext = `${desc}, ${Math.round(weatherData.current.temperature)}°C`;
    }

    // Build air quality context
    let airQualityContext = '';
    if (airQuality) {
      airQualityContext = `${airQuality.aqiLevel} (AQI: ${airQuality.usAqi})`;
    }

    // Calculate health score based on metrics
    const healthScore = this.calculateHealthScore(trackerData.metrics);

    // Determine fitness recommendation
    const fitnessRec = this.determineFitnessRecommendation(weatherData, airQuality);

    // Determine mood trend
    const moodTrend = this.determineMoodTrend(trackerData.metrics);

    return {
      summary: parsed.summary || content || 'AI analiza nije dostupna.',
      healthScore,
      recommendations:
        parsed.recommendations || this.generateDefaultRecommendations(trackerData.metrics),
      trackerSummaries: trackerData.summaries,
      healthMetrics: trackerData.metrics,
      weatherContext,
      airQualityContext,
      personalizedTips: parsed.tips || [],
      fitnessRecommendation: fitnessRec,
      moodTrend,
      generatedAt: new Date(),
    };
  }

  private calculateHealthScore(metrics: HealthMetrics): number {
    let score = 50; // Base score

    // Sleep contribution (max +15)
    if (metrics.sleepAverage >= 7 && metrics.sleepAverage <= 9) score += 15;
    else if (metrics.sleepAverage >= 6) score += 10;
    else if (metrics.sleepAverage > 0) score += 5;

    // Sleep quality contribution (max +10)
    if (metrics.sleepQualityAverage >= 4) score += 10;
    else if (metrics.sleepQualityAverage >= 3) score += 5;

    // Mood contribution (max +10)
    if (metrics.moodAverage >= 4) score += 10;
    else if (metrics.moodAverage >= 3) score += 5;

    // Water intake contribution (max +10)
    if (metrics.waterIntakeAverage >= 8) score += 10;
    else if (metrics.waterIntakeAverage >= 6) score += 7;
    else if (metrics.waterIntakeAverage >= 4) score += 3;

    // Fitness contribution (max +10)
    if (metrics.fitnessSessionsCount >= 3) score += 10;
    else if (metrics.fitnessSessionsCount >= 1) score += 5;

    // Low stress bonus (max +5)
    if (metrics.stressAverage > 0 && metrics.stressAverage <= 2) score += 5;
    else if (metrics.stressAverage <= 3) score += 2;

    return Math.min(100, Math.max(0, score));
  }

  private determineFitnessRecommendation(
    weather: WeatherData | null,
    airQuality: AirQualityData | null
  ): AIInsightData['fitnessRecommendation'] {
    let shouldExercise = true;
    let reason = 'Idealni uvjeti za vježbanje!';
    let suggestedActivity = 'trčanje ili šetnja na otvorenom';

    if (weather) {
      const code = weather.current.weatherCode;
      const temp = weather.current.temperature;

      // Bad weather conditions
      if (code >= 95) {
        shouldExercise = false;
        reason = 'Grmljavina - preporučuje se ostati unutra';
        suggestedActivity = 'vježbe u zatvorenom prostoru';
      } else if (code >= 71 && code <= 77) {
        shouldExercise = false;
        reason = 'Snježni uvjeti nisu idealni za vanjsko vježbanje';
        suggestedActivity = 'joga ili vježbe snage kod kuće';
      } else if (code >= 61 && code <= 67) {
        shouldExercise = false;
        reason = 'Kiša - bolje je vježbati unutra';
        suggestedActivity = 'teretana ili kućne vježbe';
      } else if (temp < 0) {
        reason = 'Hladno je - ako idete vani, obucite se toplo';
        suggestedActivity = 'brza šetnja ili lagano trčanje s odgovarajućom opremom';
      } else if (temp > 30) {
        reason = 'Vrlo toplo - izbjegavajte naporno vježbanje po vrućini';
        suggestedActivity = 'plivanje ili vježbanje rano ujutro/kasno navečer';
      } else if (code <= 3 && temp >= 10 && temp <= 25) {
        reason = 'Savršeni uvjeti za aktivnosti na otvorenom!';
        suggestedActivity = 'trčanje, biciklizam, ili šetnja u prirodi';
      }
    }

    if (airQuality && airQuality.usAqi > 100) {
      if (airQuality.usAqi > 150) {
        shouldExercise = false;
        reason = `Kvaliteta zraka je ${airQuality.aqiLevel.toLowerCase()} - izbjegavajte aktivnosti vani`;
        suggestedActivity = 'vježbanje u zatvorenom prostoru';
      } else {
        reason += ` (Pažnja: kvaliteta zraka je ${airQuality.aqiLevel.toLowerCase()})`;
      }
    }

    return { shouldExercise, reason, suggestedActivity };
  }

  private determineMoodTrend(metrics: HealthMetrics): AIInsightData['moodTrend'] {
    if (metrics.moodAverage === 0) {
      return {
        trend: 'stable',
        insight: 'Nema dovoljno podataka o raspoloženju. Počnite pratiti svoje raspoloženje!',
      };
    }

    if (metrics.moodAverage >= 4) {
      return {
        trend: 'improving',
        insight: 'Vaše raspoloženje je izvrsno! Nastavite s aktivnostima koje vas čine sretnim.',
      };
    } else if (metrics.moodAverage >= 3) {
      return {
        trend: 'stable',
        insight:
          'Vaše raspoloženje je stabilno. Razmislite o aktivnostima koje bi ga mogle poboljšati.',
      };
    } else {
      return {
        trend: 'declining',
        insight:
          'Primijetili smo da je raspoloženje niže. Probajte šetnju, druženje, ili neku omiljenu aktivnost.',
      };
    }
  }

  private generateDefaultRecommendations(metrics: HealthMetrics): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    if (metrics.sleepAverage < 7 || metrics.sleepAverage === 0) {
      recommendations.push({
        category: 'sleep',
        title: 'Poboljšajte san',
        description: 'Ciljajte 7-9 sati sna za optimalno zdravlje i energiju.',
        priority: 'high',
        icon: '😴',
      });
    }

    if (metrics.waterIntakeAverage < 8) {
      recommendations.push({
        category: 'health',
        title: 'Povećajte unos vode',
        description: 'Pokušajte popiti najmanje 8 čaša vode dnevno.',
        priority: metrics.waterIntakeAverage < 4 ? 'high' : 'medium',
        icon: '💧',
      });
    }

    if (metrics.fitnessSessionsCount < 3) {
      recommendations.push({
        category: 'fitness',
        title: 'Više fizičke aktivnosti',
        description: 'Cilj od 3+ treninga tjedno značajno poboljšava zdravlje.',
        priority: 'medium',
        icon: '💪',
      });
    }

    if (metrics.stressAverage > 3) {
      recommendations.push({
        category: 'wellness',
        title: 'Upravljanje stresom',
        description: 'Isprobajte tehnike opuštanja kao što su meditacija ili duboko disanje.',
        priority: 'high',
        icon: '🧘',
      });
    }

    if (metrics.screenTimeAverage > 300) {
      recommendations.push({
        category: 'wellness',
        title: 'Smanjite vrijeme ispred ekrana',
        description: 'Previše vremena ispred ekrana može utjecati na san i raspoloženje.',
        priority: 'medium',
        icon: '📱',
      });
    }

    return recommendations;
  }
}
