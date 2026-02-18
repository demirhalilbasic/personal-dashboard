import { Injectable, inject } from '@angular/core';
import { ApiStatsService } from './api-stats';

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'radio' | 'checkbox';
  answers: { label: string; value: string }[];
  correct: string[];
  userAnswers: string[];
  isCorrect?: boolean;
}

export interface QuizGenerationRequest {
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  language: 'bs' | 'en';
}

@Injectable({
  providedIn: 'root',
})
export class OpenRouterService {
  private apiStatsService = inject(ApiStatsService);

  // Use the backend API proxy endpoint (API key is on server)
  private readonly API_URL = '/api/quiz/generate';

  constructor() {}

  // API key is now handled server-side, these methods are kept for compatibility
  setApiKey(key: string): void {
    // No longer needed - API key is on server
  }

  getApiKey(): string {
    return 'server-managed';
  }

  hasApiKey(): boolean {
    // Always return true since API key is managed on server
    return true;
  }

  async generateQuiz(request: QuizGenerationRequest): Promise<QuizQuestion[]> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topics: request.topics,
          difficulty: request.difficulty,
          numberOfQuestions: request.numberOfQuestions,
          language: request.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API greška: ${response.status}`);
      }

      // Track OpenRouter API call for quiz generation
      await this.apiStatsService.incrementApiCall('openRouter');

      const data = await response.json();
      const content = data.content;

      if (!content) {
        throw new Error('Prazan odgovor od AI-a');
      }

      return this.parseQuizResponse(content, request.numberOfQuestions);
    } catch (error) {
      console.error('Error generating quiz:', error);
      throw error;
    }
  }

  private buildPrompt(
    request: QuizGenerationRequest,
    difficultyDescription: Record<string, string>
  ): string {
    const topicsList = request.topics.join(', ');
    const langInstruction =
      request.language === 'bs'
        ? 'Koristi bosanski/hrvatski/srpski jezik.'
        : 'Use English language.';

    return `Kreiraj kviz sa ${request.numberOfQuestions} pitanja na temu: ${topicsList}.
    
Težina: ${difficultyDescription[request.difficulty]}
${langInstruction}

Pravila:
1. Svako pitanje mora imati 3-4 ponuđena odgovora
2. Pitanja mogu biti tipa "radio" (jedan tačan odgovor) ili "checkbox" (više tačnih odgovora)
3. Checkbox pitanja trebaju imati 2-3 tačna odgovora od 4 ponuđena
4. Pitanja trebaju biti raznovrsna i edukativan

Odgovori ISKLJUČIVO u JSON formatu (bez markdown oznaka, bez objašnjenja):
{
  "questions": [
    {
      "id": "q1",
      "text": "Tekst pitanja?",
      "type": "radio",
      "answers": [
        {"label": "Odgovor A", "value": "a"},
        {"label": "Odgovor B", "value": "b"},
        {"label": "Odgovor C", "value": "c"}
      ],
      "correct": ["a"]
    }
  ]
}`;
  }

  private parseQuizResponse(content: string, expectedCount: number): QuizQuestion[] {
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      // Try to find JSON in the response
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Ne mogu pronaći JSON u odgovoru');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const questions = parsed.questions || parsed;

      if (!Array.isArray(questions)) {
        throw new Error('Neispravan format odgovora');
      }

      // Validate and transform questions
      return questions.slice(0, expectedCount).map(
        (q: any, index: number): QuizQuestion => ({
          id: q.id || `q${index + 1}`,
          text: `${index + 1}. ${q.text.replace(/^\d+\.\s*/, '')}`,
          type: q.type === 'checkbox' ? 'checkbox' : 'radio',
          answers: (q.answers || []).map((a: any) => ({
            label: a.label || a,
            value: a.value || a.label || a,
          })),
          correct: Array.isArray(q.correct) ? q.correct : [q.correct],
          userAnswers: [],
          isCorrect: undefined,
        })
      );
    } catch (error) {
      console.error('Error parsing quiz response:', error, content);
      throw new Error('Greška pri parsiranju kviza. Pokušajte ponovo.');
    }
  }

  // Alternative: Generate quiz using predefined templates when AI is not available
  generateFallbackQuiz(topic: string, difficulty: string): QuizQuestion[] {
    const templates: Record<string, QuizQuestion[]> = {
      html: [
        {
          id: 'q1',
          text: '1. Šta je HTML?',
          type: 'radio',
          answers: [
            { label: 'HyperText Markup Language', value: 'a' },
            { label: 'High Tech Modern Language', value: 'b' },
            { label: 'Home Tool Markup Language', value: 'c' },
          ],
          correct: ['a'],
          userAnswers: [],
        },
        {
          id: 'q2',
          text: '2. Koji tag se koristi za naslov najvišeg nivoa?',
          type: 'radio',
          answers: [
            { label: '<heading>', value: 'a' },
            { label: '<h1>', value: 'b' },
            { label: '<head>', value: 'c' },
            { label: '<title>', value: 'd' },
          ],
          correct: ['b'],
          userAnswers: [],
        },
        {
          id: 'q3',
          text: '3. Koji od navedenih su inline elementi?',
          type: 'checkbox',
          answers: [
            { label: '<span>', value: 'a' },
            { label: '<div>', value: 'b' },
            { label: '<a>', value: 'c' },
            { label: '<p>', value: 'd' },
          ],
          correct: ['a', 'c'],
          userAnswers: [],
        },
      ],
      css: [
        {
          id: 'q1',
          text: '1. Šta znači CSS?',
          type: 'radio',
          answers: [
            { label: 'Cascading Style Sheets', value: 'a' },
            { label: 'Creative Style System', value: 'b' },
            { label: 'Computer Style Sheets', value: 'c' },
          ],
          correct: ['a'],
          userAnswers: [],
        },
        {
          id: 'q2',
          text: '2. Koji selektor ima najveću specifičnost?',
          type: 'radio',
          answers: [
            { label: 'Element selektor', value: 'a' },
            { label: 'Class selektor', value: 'b' },
            { label: 'ID selektor', value: 'c' },
          ],
          correct: ['c'],
          userAnswers: [],
        },
      ],
      javascript: [
        {
          id: 'q1',
          text: '1. Kako se deklariše varijabla u modernom JavaScript-u?',
          type: 'checkbox',
          answers: [
            { label: 'let', value: 'a' },
            { label: 'const', value: 'b' },
            { label: 'var', value: 'c' },
            { label: 'variable', value: 'd' },
          ],
          correct: ['a', 'b', 'c'],
          userAnswers: [],
        },
        {
          id: 'q2',
          text: '2. Koji operator provjerava jednakost vrijednosti i tipa?',
          type: 'radio',
          answers: [
            { label: '==', value: 'a' },
            { label: '===', value: 'b' },
            { label: '=', value: 'c' },
          ],
          correct: ['b'],
          userAnswers: [],
        },
      ],
    };

    const normalizedTopic = topic.toLowerCase().trim();
    return templates[normalizedTopic] || templates['html'];
  }
}
