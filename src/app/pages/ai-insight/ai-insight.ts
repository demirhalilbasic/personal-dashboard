import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  AIInsightService,
  AIInsightData,
  AirQualityData,
  TrackerSummary,
  HealthMetrics,
} from '../../services/ai-insight';
import { AuthService, UserData } from '../../services/auth';
import { ThemeService, Theme } from '../../services/theme';
import { WeatherService } from '../../services/weather';

@Component({
  selector: 'app-ai-insight',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-insight.html',
  styleUrl: './ai-insight.css',
})
export class AiInsightPage implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('moodChart') moodChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sleepChart') sleepChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('waterChart') waterChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('stressChart') stressChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productivityChart') productivityChartRef!: ElementRef<HTMLCanvasElement>;

  // Expose Math to template
  Math = Math;

  userData: UserData | null = null;
  currentTheme: Theme | null = null;
  insightData: AIInsightData | null = null;
  airQuality: AirQualityData | null = null;
  isLoading = false;
  error: string | null = null;
  isReady = false;

  // Expanded sections
  expandedSections: Set<string> = new Set(['summary', 'recommendations', 'charts']);

  constructor(
    private aiInsightService: AIInsightService,
    private authService: AuthService,
    private themeService: ThemeService,
    private weatherService: WeatherService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.init();
  }

  ngAfterViewInit() {
    // Charts will be drawn after data loads
  }

  ngOnDestroy() {
    // Cleanup
  }

  private async init() {
    try {
      await this.authService.waitForAuthReady();
      await this.authService.waitForUserData();

      this.userData = this.authService.getUserData();
      if (!this.userData) {
        this.error = 'Korisnik nije prijavljen';
        this.isReady = true;
        return;
      }

      this.themeService.setTheme(this.userData.selectedTheme);
      this.currentTheme = this.themeService.getCurrentTheme();

      // Apply theme
      if (this.currentTheme && typeof document !== 'undefined') {
        document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
        document.body.style.backgroundAttachment = 'fixed';
      }

      await this.loadInsight();

      // Load air quality
      if (this.userData.weatherSettings) {
        this.airQuality = await this.aiInsightService.fetchAirQuality(
          this.userData.weatherSettings.latitude,
          this.userData.weatherSettings.longitude
        );
      }

      this.isReady = true;
      this.cdr.detectChanges();

      // Draw charts after view is ready - use longer delay for DOM to fully render
      setTimeout(() => {
        this.drawCharts();
        this.cdr.detectChanges();
      }, 300);
    } catch (err) {
      console.error('AI Insight page init error:', err);
      this.error = 'Greška pri učitavanju';
      this.isReady = true;
    }
  }

  private async loadInsight() {
    this.isLoading = true;
    this.error = null;

    try {
      let cached = this.aiInsightService.getInsightFromCache();
      if (cached) {
        this.insightData = cached;
      } else {
        this.insightData = await this.aiInsightService.generateInsight(false);
      }
    } catch (err) {
      console.error('Failed to load AI insight:', err);
      this.error = 'Nije moguće učitati AI analizu';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async refreshInsight() {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();

    try {
      this.aiInsightService.clearInsightCache();
      this.insightData = await this.aiInsightService.generateInsight(true);
      setTimeout(() => this.drawCharts(), 100);
    } catch (err) {
      console.error('Failed to refresh AI insight:', err);
      this.error = 'Nije moguće osvježiti AI analizu';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  toggleSection(section: string) {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);

      // Redraw charts when charts section is expanded
      if (section === 'charts') {
        setTimeout(() => this.drawCharts(), 100);
      }
    }
    this.cdr.detectChanges();
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  // Chart drawing methods using vanilla Canvas
  private drawCharts() {
    if (!this.insightData) return;

    this.drawMoodChart();
    this.drawSleepChart();
    this.drawActivityChart();
    this.drawWaterChart();
    this.drawStressChart();
    this.drawProductivityChart();
  }

  private drawMoodChart() {
    const canvas = this.moodChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = this.insightData.healthMetrics;
    const data = [
      { label: 'Raspoloženje', value: metrics.moodAverage || 0, color: '#e91e63' },
      { label: 'Energija', value: metrics.energyAverage || 0, color: '#ff9800' },
      { label: 'Stres', value: 5 - (metrics.stressAverage || 0), color: '#4caf50' }, // Invert stress
    ];

    this.drawBarChart(ctx, canvas, data, 5);
  }

  private drawSleepChart() {
    const canvas = this.sleepChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = this.insightData.healthMetrics;
    const sleepHours = metrics.sleepAverage || 0;
    const sleepQuality = metrics.sleepQualityAverage || 0;

    this.drawGaugeChart(ctx, canvas, sleepHours, 10, 'sati', '#9c27b0');
  }

  private drawActivityChart() {
    const canvas = this.activityChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get tracker completion rates for a more meaningful visualization
    const trackers = this.insightData.trackerSummaries;

    // Find relevant activity trackers or use metrics as fallback
    const data: { label: string; value: number; max: number; color: string }[] = [];

    // Look for specific trackers and add their completion rates
    const fitnessTracker = trackers.find(
      (t) =>
        t.trackerName.toLowerCase().includes('fitness') ||
        t.trackerName.toLowerCase().includes('aktivnost') ||
        t.trackerName.toLowerCase().includes('exercise')
    );
    const habitTracker = trackers.find(
      (t) =>
        t.trackerName.toLowerCase().includes('habit') ||
        t.trackerName.toLowerCase().includes('navika')
    );
    const studyTracker = trackers.find(
      (t) =>
        t.trackerName.toLowerCase().includes('study') ||
        t.trackerName.toLowerCase().includes('učenje') ||
        t.trackerName.toLowerCase().includes('learning')
    );

    if (fitnessTracker) {
      data.push({
        label: 'Fitness',
        value: fitnessTracker.completionRate,
        max: 100,
        color: '#ff5722',
      });
    }
    if (habitTracker) {
      data.push({
        label: 'Navike',
        value: habitTracker.completionRate,
        max: 100,
        color: '#4caf50',
      });
    }
    if (studyTracker) {
      data.push({
        label: 'Učenje',
        value: studyTracker.completionRate,
        max: 100,
        color: '#2196f3',
      });
    }

    // If no specific trackers found, use top 3 active trackers by completion rate
    if (data.length === 0 && trackers.length > 0) {
      const sortedTrackers = [...trackers]
        .filter((t) => t.completionRate > 0)
        .sort((a, b) => b.completionRate - a.completionRate)
        .slice(0, 3);

      const colors = ['#ff5722', '#4caf50', '#2196f3'];
      sortedTrackers.forEach((tracker, i) => {
        data.push({
          label: tracker.trackerName.substring(0, 10),
          value: tracker.completionRate,
          max: 100,
          color: colors[i % colors.length],
        });
      });
    }

    // Fallback to original metrics if still no data
    if (data.length === 0) {
      const metrics = this.insightData.healthMetrics;
      data.push(
        {
          label: 'Fitness',
          value: Math.min(metrics.fitnessSessionsCount * 14, 100),
          max: 100,
          color: '#ff5722',
        },
        {
          label: 'Učenje',
          value: Math.min((metrics.studyMinutesTotal / 60) * 10, 100),
          max: 100,
          color: '#2196f3',
        }
      );
    }

    this.drawProgressBarsWithPercent(ctx, canvas, data);
  }

  private drawWaterChart() {
    const canvas = this.waterChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = this.insightData.healthMetrics;
    const glasses = metrics.waterIntakeAverage || 0;

    this.drawWaterGlass(ctx, canvas, glasses, 8);
  }

  private drawBarChart(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: { label: string; value: number; color: string }[],
    maxValue: number
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const barWidth = (width - padding * 2) / data.length - 20;

    ctx.clearRect(0, 0, width, height);

    data.forEach((item, index) => {
      const x = padding + index * (barWidth + 20) + 10;
      const barHeight = (item.value / maxValue) * (height - padding * 2);
      const y = height - padding - barHeight;

      // Draw bar
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 8);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + barWidth / 2, height - 10);

      // Draw value
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(item.value.toFixed(1), x + barWidth / 2, y - 10);
    });
  }

  private drawGaugeChart(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    value: number,
    maxValue: number,
    unit: string,
    color: string
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2 + 20;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value arc
    const percentage = Math.min(value / maxValue, 1);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + percentage * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(1), centerX, centerY - 10);

    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.fillText(unit, centerX, centerY + 15);
  }

  private drawProgressBars(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: { label: string; value: number; max: number; color: string }[]
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const barHeight = 30;
    const gap = 20;

    ctx.clearRect(0, 0, width, height);

    data.forEach((item, index) => {
      const y = padding + index * (barHeight + gap + 20);

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, padding, y);

      // Background bar
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.roundRect(padding, y + 8, width - padding * 2, barHeight, 8);
      ctx.fill();

      // Value bar
      const barWidth = ((width - padding * 2) * item.value) / item.max;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(padding, y + 8, Math.max(barWidth, 0), barHeight, 8);
      ctx.fill();

      // Value text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      if (barWidth > 40) {
        ctx.fillText(
          `${item.value.toFixed(item.label === 'Učenje' ? 1 : 0)}${
            item.label === 'Učenje' ? 'h' : ''
          }`,
          padding + barWidth / 2,
          y + 8 + barHeight / 2 + 4
        );
      }
    });
  }

  private drawProgressBarsWithPercent(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: { label: string; value: number; max: number; color: string }[]
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 20;
    const barHeight = 24;
    const gap = 12;

    ctx.clearRect(0, 0, width, height);

    data.forEach((item, index) => {
      const y = padding + index * (barHeight + gap + 18);

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, padding, y);

      // Percentage on right
      ctx.fillStyle = item.color;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(item.value)}%`, width - padding, y);

      // Background bar
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.roundRect(padding, y + 6, width - padding * 2, barHeight, 6);
      ctx.fill();

      // Value bar
      const barWidthVal = ((width - padding * 2) * item.value) / item.max;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(padding, y + 6, Math.max(barWidthVal, 0), barHeight, 6);
      ctx.fill();
    });
  }

  private drawWaterGlass(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    glasses: number,
    goal: number
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const glassWidth = 60;
    const glassHeight = 80;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw glass outline
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - glassWidth / 2, centerY - glassHeight / 2);
    ctx.lineTo(centerX - glassWidth / 2 + 10, centerY + glassHeight / 2);
    ctx.lineTo(centerX + glassWidth / 2 - 10, centerY + glassHeight / 2);
    ctx.lineTo(centerX + glassWidth / 2, centerY - glassHeight / 2);
    ctx.stroke();

    // Fill level
    const fillPercentage = Math.min(glasses / goal, 1);
    const fillHeight = glassHeight * fillPercentage * 0.9;
    const fillBottom = centerY + glassHeight / 2 - 5;

    ctx.fillStyle = 'rgba(0, 188, 212, 0.6)';
    ctx.beginPath();
    ctx.moveTo(centerX - glassWidth / 2 + 12, fillBottom);
    ctx.lineTo(
      centerX - glassWidth / 2 + 12 - (fillHeight / glassHeight) * 8,
      fillBottom - fillHeight
    );
    ctx.lineTo(
      centerX + glassWidth / 2 - 12 + (fillHeight / glassHeight) * 8,
      fillBottom - fillHeight
    );
    ctx.lineTo(centerX + glassWidth / 2 - 12, fillBottom);
    ctx.closePath();
    ctx.fill();

    // Text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${glasses.toFixed(1)}`, centerX, centerY + glassHeight / 2 + 30);

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.fillText(`od ${goal} čaša`, centerX, centerY + glassHeight / 2 + 48);
  }

  private drawStressChart() {
    const canvas = this.stressChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = this.insightData.healthMetrics;
    const stressLevel = metrics.stressAverage || 0;

    // Draw stress meter (inverted - lower is better)
    this.drawStressMeter(ctx, canvas, stressLevel, 5);
  }

  private drawStressMeter(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    stress: number,
    maxStress: number
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const radius = Math.min(width, height) / 2 - 30;

    ctx.clearRect(0, 0, width, height);

    // Draw segments (green to red)
    const segments = 5;
    const colors = ['#4caf50', '#8bc34a', '#ffeb3b', '#ff9800', '#f44336'];

    for (let i = 0; i < segments; i++) {
      const startAngle = Math.PI + (i / segments) * Math.PI;
      const endAngle = Math.PI + ((i + 1) / segments) * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = 18;
      ctx.lineCap = 'butt';
      ctx.stroke();
    }

    // Draw needle
    const percentage = Math.min(stress / maxStress, 1);
    const needleAngle = Math.PI + percentage * Math.PI;
    const needleLength = radius - 10;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(needleAngle);

    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(0, -needleLength);
    ctx.lineTo(5, 0);
    ctx.closePath();
    ctx.fillStyle = '#333';
    ctx.fill();

    // Center circle
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    ctx.restore();

    // Labels
    ctx.fillStyle = '#4caf50';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nizak', 15, centerY + 25);

    ctx.fillStyle = '#f44336';
    ctx.textAlign = 'right';
    ctx.fillText('Visok', width - 15, centerY + 25);

    // Value
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${stress.toFixed(1)}/5`, centerX, height - 10);
  }

  private drawProductivityChart() {
    const canvas = this.productivityChartRef?.nativeElement;
    if (!canvas || !this.insightData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = this.insightData.healthMetrics;

    // Calculate productivity score based on study time and fitness
    const studyHours = metrics.studyMinutesTotal / 60;
    const fitnessSessions = metrics.fitnessSessionsCount;
    const screenTime = metrics.screenTimeAverage || 0;

    const data = [
      {
        label: 'Učenje',
        value: studyHours,
        max: 20, // Max 20 hours per week
        color: '#2196f3',
        unit: 'h',
      },
      {
        label: 'Fitness',
        value: fitnessSessions,
        max: 7, // Max 7 sessions per week
        color: '#ff5722',
        unit: '',
      },
      {
        label: 'Ekran',
        value: screenTime / 60, // Convert to hours
        max: 8, // Max 8 hours avg
        color: '#9c27b0',
        unit: 'h',
      },
    ];

    this.drawHorizontalBars(ctx, canvas, data);
  }

  private drawHorizontalBars(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    data: { label: string; value: number; max: number; color: string; unit: string }[]
  ) {
    const width = canvas.width;
    const height = canvas.height;
    const padding = 15;
    const barHeight = 22;
    const gap = 8;
    const labelWidth = 60;

    ctx.clearRect(0, 0, width, height);

    data.forEach((item, index) => {
      const y = padding + index * (barHeight + gap + 20);

      // Label
      ctx.fillStyle = '#333';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, padding, y + 4);

      // Value on right
      ctx.fillStyle = item.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${item.value.toFixed(1)}${item.unit}`, width - padding, y + 4);

      // Background bar
      const barX = padding + labelWidth;
      const barWidth = width - padding * 2 - labelWidth - 40;

      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.roundRect(barX, y + 10, barWidth, barHeight, 5);
      ctx.fill();

      // Value bar
      const fillWidth = Math.min((item.value / item.max) * barWidth, barWidth);
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(barX, y + 10, Math.max(fillWidth, 0), barHeight, 5);
      ctx.fill();
    });
  }

  // Helper methods
  getHealthScoreColor(): string {
    if (!this.insightData) return '#9e9e9e';
    const score = this.insightData.healthScore;
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#8bc34a';
    if (score >= 40) return '#ffeb3b';
    if (score >= 20) return '#ff9800';
    return '#f44336';
  }

  getHealthScoreLabel(): string {
    if (!this.insightData) return 'Nepoznato';
    const score = this.insightData.healthScore;
    if (score >= 80) return 'Odlično zdravlje';
    if (score >= 60) return 'Dobro zdravlje';
    if (score >= 40) return 'Umjereno zdravlje';
    if (score >= 20) return 'Potrebno poboljšanje';
    return 'Kritično stanje';
  }

  getAQIColor(): string {
    return this.airQuality?.aqiColor || '#9e9e9e';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  formatSummary(): string[] {
    if (!this.insightData?.summary) return [];
    // Parse markdown formatting
    return (
      this.insightData.summary
        .split('\n')
        .filter((line) => line.trim())
        // Filter out horizontal rules (---, ***, ___)
        .filter((line) => !/^[-*_]{3,}$/.test(line.trim()))
        .map((line) => {
          // Convert markdown headers to styled text
          line = line.replace(/^### (.+)$/gm, '<h3 class="summary-h3">$1</h3>');
          line = line.replace(/^## (.+)$/gm, '<h2 class="summary-h2">$1</h2>');
          // Convert bold **text**
          line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          // Convert numbered lists
          line = line.replace(
            /^(\d+)\.\s(.+)$/gm,
            '<div class="summary-list-item"><span class="list-num">$1</span><span>$2</span></div>'
          );
          return line;
        })
    );
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  }

  formatGeneratedTime(): string {
    if (!this.insightData?.generatedAt) return '';
    const date = new Date(this.insightData.generatedAt);
    return date.toLocaleString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
