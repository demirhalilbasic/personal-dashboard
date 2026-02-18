import { Injectable, signal } from '@angular/core';

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  descriptions: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private currentTheme = signal<Theme | null>(null);
  private currentDescriptionIndex = signal<number>(0);

  readonly themes: Theme[] = [
    {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      emoji: '🌃',
      colors: {
        primary: '#ff00ff',
        secondary: '#00ffff',
        accent: '#ffff00',
        background: '#0a0a0a',
        surface: '#1a1a2e',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
      },
      descriptions: [
        'Neonska budućnost čeka vas! Uronite u svijet cyber tehnologije.',
        'High-tech, low-life estetika za moderne digitalne nomade.',
        'Električni puls grada u vašim rukama. Welcome to the future.',
      ],
    },
    {
      id: 'nature',
      name: 'Priroda',
      emoji: '🌿',
      colors: {
        primary: '#2d5016',
        secondary: '#6b8e23',
        accent: '#8fbc8f',
        background: '#f5f5dc',
        surface: '#ffffff',
        text: '#2c3e2c',
        textSecondary: '#5a6b5a',
      },
      descriptions: [
        'Mir i harmonija šume dolaze u vaš digitalni prostor.',
        'Zelena oaza mira za produktivnost i fokus.',
        'Osjetite energiju prirode kroz svaki klik i scroll.',
      ],
    },
    {
      id: 'ocean',
      name: 'Ocean',
      emoji: '🌊',
      colors: {
        primary: '#006994',
        secondary: '#4a90a4',
        accent: '#87ceeb',
        background: '#e6f3f7',
        surface: '#ffffff',
        text: '#003d5c',
        textSecondary: '#4a7c8c',
      },
      descriptions: [
        'Duboko plave vode nose vas prema novim avanturama.',
        'Smirenost oceana u svakom kutku vašeg dashboarda.',
        'Plutajte kroz zadatke s lakoćom morskih talasa.',
      ],
    },
    {
      id: 'sunset',
      name: 'Zalazak Sunca',
      emoji: '🌅',
      colors: {
        primary: '#ff6b35',
        secondary: '#f7931e',
        accent: '#ffd700',
        background: '#fff4e6',
        surface: '#ffffff',
        text: '#5c3d2e',
        textSecondary: '#8b6d5c',
      },
      descriptions: [
        'Topli tonovi zalaska sunca prate vas kroz dan.',
        'Zlatni sati inspiracije i kreativnosti.',
        'Osjetite toplinu sumraka u svakom detalju.',
      ],
    },
    {
      id: 'minimal',
      name: 'Minimal',
      emoji: '⚪',
      colors: {
        primary: '#000000',
        secondary: '#333333',
        accent: '#666666',
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#000000',
        textSecondary: '#666666',
      },
      descriptions: [
        'Manje je više. Čista linija, fokusirani um.',
        'Jednostavnost i elegancija u svakom pikselu.',
        'Bez distrakcija, samo suština. Pure productivity.',
      ],
    },
    {
      id: 'neon',
      name: 'Neon',
      emoji: '✨',
      colors: {
        primary: '#ff1744',
        secondary: '#00e5ff',
        accent: '#76ff03',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
      },
      descriptions: [
        'Električni šok boja osvjetljava vaš digitalni svijet.',
        'Vibrantna energija koja vas pokreće naprijed.',
        'Svijetlite jače od neonskih reklama velikog grada.',
      ],
    },
    {
      id: 'classic',
      name: 'Klasik',
      emoji: '📚',
      colors: {
        primary: '#8b4513',
        secondary: '#d2691e',
        accent: '#daa520',
        background: '#faf8f3',
        surface: '#ffffff',
        text: '#3e2723',
        textSecondary: '#6d4c41',
      },
      descriptions: [
        'Vremenski elegancija koja nikada ne izlazi iz mode.',
        'Kao stara, dobra knjiga - uvijek pouzdana.',
        'Tradicionalne vrijednosti u modernom ruhu.',
      ],
    },
    {
      id: 'dark',
      name: 'Tamna',
      emoji: '🌑',
      colors: {
        primary: '#bb86fc',
        secondary: '#03dac6',
        accent: '#cf6679',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#b0b0b0',
      },
      descriptions: [
        'Za noćne sovice i coding maraton sesije.',
        'Vaše oči će vam biti zahvalne. Dark mode done right.',
        'Elegancija tame, snaga fokusa.',
      ],
    },
    {
      id: 'pastel',
      name: 'Pastel',
      emoji: '🎨',
      colors: {
        primary: '#ffb3ba',
        secondary: '#bae1ff',
        accent: '#ffffba',
        background: '#fff9f9',
        surface: '#ffffff',
        text: '#4a4a4a',
        textSecondary: '#7a7a7a',
      },
      descriptions: [
        'Nježni tonovi za nježnu dušu. Soft power.',
        'Kao oblak šećerne vune u digitalnom obliku.',
        'Sweet dreams are made of these pastel schemes.',
      ],
    },
    {
      id: 'retro',
      name: 'Retro',
      emoji: '📟',
      colors: {
        primary: '#e91e63',
        secondary: '#9c27b0',
        accent: '#ff9800',
        background: '#fce4ec',
        surface: '#ffffff',
        text: '#4a148c',
        textSecondary: '#7b1fa2',
      },
      descriptions: [
        'Povratak u 80-te, ali s modernim twist-om.',
        'Nostalgia meets innovation. Best of both worlds.',
        'Retro vibes za futurističke ciljeve.',
      ],
    },
  ];

  getCurrentTheme() {
    return this.currentTheme();
  }

  setTheme(themeId: string) {
    const theme = this.themes.find((t) => t.id === themeId);
    if (theme) {
      this.currentTheme.set(theme);
      this.applyThemeToDOM(theme);
      this.currentDescriptionIndex.set(0);
      // Save theme to localStorage for persistence
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('selectedThemeId', themeId);
      }
    }
  }

  // Load theme from localStorage (for pages that need user's theme)
  loadSavedTheme(): Theme | null {
    if (typeof localStorage === 'undefined') return null;

    const savedThemeId = localStorage.getItem('selectedThemeId');
    if (savedThemeId) {
      const theme = this.themes.find((t) => t.id === savedThemeId);
      if (theme) {
        this.currentTheme.set(theme);
        this.applyThemeToDOM(theme);
        return theme;
      }
    }
    return null;
  }

  private applyThemeToDOM(theme: Theme) {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }

  getCurrentDescription(themeId: string): string {
    const theme = this.themes.find((t) => t.id === themeId);
    if (!theme) return '';

    const index = this.currentDescriptionIndex();
    return theme.descriptions[index % theme.descriptions.length];
  }

  rotateDescription(themeId: string) {
    const theme = this.themes.find((t) => t.id === themeId);
    if (theme) {
      this.currentDescriptionIndex.update((i) => (i + 1) % theme.descriptions.length);
    }
  }

  getThemeById(themeId: string): Theme | undefined {
    return this.themes.find((t) => t.id === themeId);
  }

  // Reset theme to default (for guest pages)
  resetToDefault() {
    this.currentTheme.set(null);
    this.clearThemeFromDOM();
  }

  private clearThemeFromDOM() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    // Remove all custom theme CSS variables
    const themeKeys = [
      'primary',
      'secondary',
      'accent',
      'background',
      'surface',
      'text',
      'textSecondary',
    ];
    themeKeys.forEach((key) => {
      root.style.removeProperty(`--color-${key}`);
    });

    // Reset body background to default
    document.body.style.background = '';
    document.body.style.backgroundAttachment = '';
  }
}
