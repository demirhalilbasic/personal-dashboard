import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AIInsightService, AIInsightData, AIRecommendation } from '../../services/ai-insight';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-ai-insight-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ai-insight-widget.html',
  styleUrl: './ai-insight-widget.css',
})
export class AiInsightWidgetComponent implements OnInit, OnDestroy {
  insightData: AIInsightData | null = null;
  isLoading = false;
  error: string | null = null;
  isExpanded = false;

  private refreshInterval: any;

  constructor(
    private aiInsightService: AIInsightService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadInsight();
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private async loadInsight() {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.isLoading = true;
    this.error = null;

    try {
      // First try from cache
      let cached = this.aiInsightService.getInsightFromCache();
      if (cached) {
        this.insightData = cached;
        this.isLoading = false;
        this.cdr.detectChanges();
      } else {
        // Generate new insight
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
      // Clear cache and force refresh
      this.aiInsightService.clearInsightCache();
      this.insightData = await this.aiInsightService.generateInsight(true);
    } catch (err) {
      console.error('Failed to refresh AI insight:', err);
      this.error = 'Nije moguće osvježiti AI analizu';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

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
    if (score >= 80) return 'Odlično';
    if (score >= 60) return 'Dobro';
    if (score >= 40) return 'Umjereno';
    if (score >= 20) return 'Potrebno poboljšanje';
    return 'Kritično';
  }

  getMoodTrendIcon(): string {
    if (!this.insightData) return '➡️';
    switch (this.insightData.moodTrend.trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '➡️';
    }
  }

  getFitnessIcon(): string {
    if (!this.insightData) return '🏃';
    return this.insightData.fitnessRecommendation.shouldExercise ? '✅' : '⚠️';
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  }

  getTopRecommendations(): AIRecommendation[] {
    if (!this.insightData) return [];
    return this.insightData.recommendations.slice(0, 3);
  }

  formatGeneratedTime(): string {
    if (!this.insightData?.generatedAt) return '';
    const date = new Date(this.insightData.generatedAt);
    return date.toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit' });
  }

  getSummaryPreview(): string {
    if (!this.insightData?.summary) return '';
    // Get first 200 characters or first paragraph
    const summary = this.insightData.summary;
    const firstParagraph = summary.split('\n\n')[0];
    if (firstParagraph.length <= 200) return firstParagraph;
    return summary.substring(0, 200) + '...';
  }
}
