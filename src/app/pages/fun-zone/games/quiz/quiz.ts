import { Component, OnInit, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';
import { FunZoneService, QuizStats } from '../../../../services/funzone';
import {
  OpenRouterService,
  QuizQuestion,
  QuizGenerationRequest,
} from '../../../../services/openrouter';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './quiz.html',
  styleUrls: ['./quiz.css'],
})
export class QuizComponent implements OnInit {
  // Quiz state
  showResult = false;
  showPerfectOverlay = false;
  score = 0;
  maxScore = 0;
  currentTheme: any;
  private isBrowser: boolean;

  // Setup screen
  showSetup = true;
  selectedTopics: string[] = [];
  selectedDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
  numberOfQuestions = 5;

  // Available topics
  availableTopics = [
    { id: 'html', name: 'HTML', emoji: '🌐' },
    { id: 'css', name: 'CSS', emoji: '🎨' },
    { id: 'javascript', name: 'JavaScript', emoji: '⚡' },
    { id: 'angular', name: 'Angular', emoji: '🅰️' },
    { id: 'typescript', name: 'TypeScript', emoji: '📘' },
    { id: 'git', name: 'Git & GitHub', emoji: '🔀' },
    { id: 'networking', name: 'Mreže & Internet', emoji: '🌍' },
    { id: 'databases', name: 'Baze podataka', emoji: '🗄️' },
    { id: 'algorithms', name: 'Algoritmi', emoji: '🧮' },
    { id: 'security', name: 'Sigurnost', emoji: '🔐' },
  ];

  // AI Generation
  isGenerating = false;
  generationError = '';

  // Did You Know facts for loading screen
  currentDidYouKnow = '';
  private didYouKnowInterval: any;
  private didYouKnowFacts = [
    'Prvi programer na svijetu bila je žena - Ada Lovelace, koja je napisala prvi algoritam 1843. godine.',
    'JavaScript je napravljen za samo 10 dana! Brendan Eich ga je kreirao 1995. godine.',
    'Prva računalna "buba" (bug) bila je prava buba - moljac pronađen u računalu 1947. godine.',
    'Google pretraživanja troše energiju dovoljnu za kuhanje jajeta na oko.',
    'Više od 90% svjetskog internetskog prometa prolazi kroz podmorske kablove.',
    'Prosječan korisnik interneta provede oko 7 sati dnevno online.',
    'Prva web stranica i dalje postoji na adresi info.cern.ch od 1991. godine.',
    'Python je dobio ime po komedijaškoj grupi Monty Python, ne po zmiji!',
    'Emoji 😀 su nastali u Japanu 1999. godine.',
    'Prosječna tipkovnica ima više bakterija nego WC daska!',
    'NASA još uvijek koristi programe napisane u programskom jeziku iz 1970-ih.',
    'Više od 500 sati video sadržaja se uploada na YouTube svake minute.',
    'Blockchain tehnologija je prvi put opisana 1991. godine.',
    'Najveći DDoS napad ikad zabilježen imao je 3.47 Tbps prometa.',
    'Prosječan smartphone danas ima više računalne snage nego Apollo 11 misija.',
  ];

  // Statistics
  stats: QuizStats | null = null;
  showStatsPanel = false;

  // Questions
  questions: QuizQuestion[] = [];

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private funZoneService: FunZoneService,
    private openRouterService: OpenRouterService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.currentTheme = this.themeService.getCurrentTheme();
  }

  async ngOnInit() {
    this.applyTheme();

    if (this.isBrowser) {
      await this.loadStats();
    }
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

  async loadStats() {
    try {
      this.stats = await this.funZoneService.getQuizStats();
    } catch (error) {
      console.error('Error loading quiz stats:', error);
    }
  }

  // Topic selection
  toggleTopic(topicId: string) {
    const index = this.selectedTopics.indexOf(topicId);
    if (index === -1) {
      this.selectedTopics.push(topicId);
    } else {
      this.selectedTopics.splice(index, 1);
    }
  }

  isTopicSelected(topicId: string): boolean {
    return this.selectedTopics.includes(topicId);
  }

  getSelectedTopicsNames(): string {
    return this.selectedTopics
      .map((id) => this.availableTopics.find((t) => t.id === id)?.name || id)
      .join(', ');
  }

  // Quiz generation
  async generateQuiz() {
    if (this.selectedTopics.length === 0) {
      this.generationError = 'Molimo odaberite barem jednu temu.';
      return;
    }

    this.isGenerating = true;
    this.generationError = '';
    this.startDidYouKnowRotation();
    this.cdr.detectChanges();

    try {
      const topicNames = this.selectedTopics.map(
        (id) => this.availableTopics.find((t) => t.id === id)?.name || id
      );

      // Use AI to generate questions via backend API
      const request: QuizGenerationRequest = {
        topics: topicNames,
        difficulty: this.selectedDifficulty,
        numberOfQuestions: this.numberOfQuestions,
        language: 'bs',
      };

      this.questions = await this.openRouterService.generateQuiz(request);

      this.maxScore = this.questions.length;
      this.showSetup = false;
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      this.generationError = error.message || 'Greška pri generiranju kviza. Pokušajte ponovo.';

      // Fallback to predefined questions
      if (this.selectedTopics.length > 0) {
        this.questions = this.openRouterService.generateFallbackQuiz(
          this.selectedTopics[0],
          this.selectedDifficulty
        );
        this.maxScore = this.questions.length;
        this.showSetup = false;
        this.generationError = '';
        this.cdr.detectChanges();
      }
    } finally {
      this.isGenerating = false;
      this.stopDidYouKnowRotation();
      this.cdr.detectChanges();
    }
  }

  // Did You Know rotation methods
  private startDidYouKnowRotation() {
    this.currentDidYouKnow = this.getRandomDidYouKnow();
    this.didYouKnowInterval = setInterval(() => {
      this.currentDidYouKnow = this.getRandomDidYouKnow();
      this.cdr.detectChanges();
    }, 4000);
  }

  private stopDidYouKnowRotation() {
    if (this.didYouKnowInterval) {
      clearInterval(this.didYouKnowInterval);
      this.didYouKnowInterval = null;
    }
  }

  private getRandomDidYouKnow(): string {
    const randomIndex = Math.floor(Math.random() * this.didYouKnowFacts.length);
    return this.didYouKnowFacts[randomIndex];
  }

  // Quiz interaction
  onRadioChange(question: QuizQuestion, value: string) {
    question.userAnswers = [value];
  }

  onCheckboxChange(question: QuizQuestion, value: string, checked: boolean) {
    if (checked) {
      if (!question.userAnswers.includes(value)) {
        question.userAnswers.push(value);
      }
    } else {
      question.userAnswers = question.userAnswers.filter((a) => a !== value);
    }
  }

  isChecked(question: QuizQuestion, value: string): boolean {
    return question.userAnswers.includes(value);
  }

  async checkAnswers() {
    this.score = 0;

    this.questions.forEach((q) => {
      const correctSet = new Set(q.correct.map(this.normalize));
      const userSet = new Set(q.userAnswers.map(this.normalize));

      const allCorrectSelected = q.correct
        .map(this.normalize)
        .every((a) => Array.from(userSet).includes(a));

      const noIncorrect = Array.from(userSet).every((a) => Array.from(correctSet).includes(a));

      q.isCorrect = allCorrectSelected && noIncorrect;

      if (q.isCorrect) {
        this.score++;
      }
    });

    this.showResult = true;

    if (this.score === this.maxScore) {
      this.showPerfectOverlay = true;
    }

    // Save stats to Firestore
    const topicName = this.getSelectedTopicsNames();
    try {
      await this.funZoneService.updateQuizStats(
        this.score,
        this.maxScore,
        topicName,
        this.selectedDifficulty
      );
      await this.loadStats();
    } catch (error) {
      console.error('Error saving quiz stats:', error);
    }
  }

  normalize(str: string): string {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').replace(/=\s+/g, '=').replace(/\\+/g, '').trim();
  }

  restart() {
    this.questions.forEach((q) => {
      q.userAnswers = [];
      q.isCorrect = undefined;
    });
    this.showResult = false;
    this.showPerfectOverlay = false;
    this.score = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToSetup() {
    this.showSetup = true;
    this.questions = [];
    this.showResult = false;
    this.showPerfectOverlay = false;
    this.score = 0;
  }

  closePerfectOverlay() {
    this.showPerfectOverlay = false;
  }

  toggleStatsPanel() {
    this.showStatsPanel = !this.showStatsPanel;
  }

  getAverageScore(): number {
    if (!this.stats || this.stats.totalQuestions === 0) return 0;
    return Math.round((this.stats.correctAnswers / this.stats.totalQuestions) * 100);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
