import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { ThemeService, Theme } from '../../../services/theme';
import { WeatherService } from '../../../services/weather';
import { AIInsightService } from '../../../services/ai-insight';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register implements OnInit, OnDestroy {
  registerForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  themes: Theme[] = [];
  selectedThemeId: string = '';
  currentThemeDescription: string = '';
  private descriptionInterval: any;

  // Password strength tracking
  passwordRequirements = {
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    passwordsMatch: false,
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private themeService: ThemeService,
    private weatherService: WeatherService,
    private aiInsightService: AIInsightService,
    private router: Router
  ) {
    this.themes = this.themeService.themes;

    this.registerForm = this.fb.group(
      {
        ime: ['', [Validators.required, this.capitalizedNameValidator]],
        prezime: ['', [Validators.required, this.capitalizedNameValidator]],
        email: ['', [Validators.required, Validators.email, this.emailDomainValidator]],
        spol: ['', [Validators.required]],
        datumRodjenja: ['', [Validators.required, this.minimumAgeValidator]],
        password: [
          '',
          [Validators.required, Validators.minLength(8), this.passwordStrengthValidator],
        ],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit() {
    // Auto-select first theme
    if (this.themes.length > 0) {
      this.selectTheme(this.themes[0].id);
    }

    // Watch password changes
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.updatePasswordRequirements();
    });

    this.registerForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.updatePasswordRequirements();
    });
  }

  ngOnDestroy() {
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
    }
    // Reset to default background and CSS variables when leaving page (only in browser)
    if (typeof document !== 'undefined') {
      document.body.style.background =
        'linear-gradient(135deg, #e8f0f7 0%, #d4e3f0 50%, #c5d9ed 100%)';
      document.body.style.backgroundAttachment = 'fixed';

      // Reset CSS variables to default
      const root = document.documentElement;
      root.style.setProperty('--color-primary', '#345aaa');
      root.style.setProperty('--color-secondary', '#2a4a8a');
      root.style.setProperty('--color-accent', '#ff9800');
      root.style.setProperty('--color-background', '#f5f5f5');
      root.style.setProperty('--color-surface', '#ffffff');
      root.style.setProperty('--color-text', '#333333');
      root.style.setProperty('--color-textSecondary', '#666666');
    }
  }

  get ime() {
    return this.registerForm.get('ime');
  }
  get prezime() {
    return this.registerForm.get('prezime');
  }
  get email() {
    return this.registerForm.get('email');
  }
  get spol() {
    return this.registerForm.get('spol');
  }
  get datumRodjenja() {
    return this.registerForm.get('datumRodjenja');
  }
  get password() {
    return this.registerForm.get('password');
  }
  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  emailDomainValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const email = control.value;
    if (email && !email.endsWith('@ipi-akademija.ba')) {
      return { invalidDomain: true };
    }
    return null;
  }

  capitalizedNameValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const name = control.value;
    if (name && name.length > 0) {
      const firstChar = name.charAt(0);
      if (firstChar !== firstChar.toUpperCase() || firstChar === firstChar.toLowerCase()) {
        return { notCapitalized: true };
      }
    }
    return null;
  }

  minimumAgeValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const dateValue = control.value;
    if (!dateValue) return null;

    const birthDate = new Date(dateValue);
    const today = new Date();

    // Calculate age
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 13) {
      return { underAge: true };
    }

    return null;
  }

  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return { weakPassword: true };
    }

    return null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }

    return null;
  }

  updatePasswordRequirements() {
    const password = this.password?.value || '';
    const confirmPassword = this.confirmPassword?.value || '';

    this.passwordRequirements.minLength = password.length >= 8;
    this.passwordRequirements.hasUpperCase = /[A-Z]/.test(password);
    this.passwordRequirements.hasLowerCase = /[a-z]/.test(password);
    this.passwordRequirements.hasNumber = /\d/.test(password);
    this.passwordRequirements.hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    this.passwordRequirements.passwordsMatch = password.length > 0 && password === confirmPassword;
  }

  isFormValid(): boolean {
    return (
      this.registerForm.valid &&
      this.selectedThemeId !== '' &&
      Object.values(this.passwordRequirements).every((req) => req === true)
    );
  }

  getMaxBirthDate(): string {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  }

  selectTheme(themeId: string) {
    this.selectedThemeId = themeId;
    this.updateThemeDescription();

    // Apply theme to entire page (navbar, footer, background)
    this.applyThemeToPage(themeId);

    // Clear existing interval
    if (this.descriptionInterval) {
      clearInterval(this.descriptionInterval);
    }

    // Rotate descriptions every 4 seconds
    this.descriptionInterval = setInterval(() => {
      this.themeService.rotateDescription(themeId);
      this.updateThemeDescription();
    }, 4000);
  }

  applyThemeToPage(themeId: string) {
    // Check if running in browser (not SSR)
    if (typeof document === 'undefined') {
      return;
    }

    const theme = this.themeService.getThemeById(themeId);
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-secondary', theme.colors.secondary);
      root.style.setProperty('--color-accent', theme.colors.accent);
      root.style.setProperty('--color-background', theme.colors.background);
      root.style.setProperty('--color-surface', theme.colors.surface);
      root.style.setProperty('--color-text', theme.colors.text);
      root.style.setProperty('--color-textSecondary', theme.colors.textSecondary);

      // Apply background gradient
      document.body.style.background = `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`;
      document.body.style.backgroundAttachment = 'fixed';
    }
  }

  updateThemeDescription() {
    this.currentThemeDescription = this.themeService.getCurrentDescription(this.selectedThemeId);
  }

  getPreviewBackground(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme
      ? `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.secondary} 100%)`
      : 'linear-gradient(135deg, #345aaa 0%, #2a4a8a 100%)';
  }

  getPreviewSurface(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme ? theme.colors.surface : 'white';
  }

  getPreviewText(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme ? theme.colors.text : '#333';
  }

  getPreviewTextSecondary(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme ? theme.colors.textSecondary : '#666';
  }

  getPreviewPrimary(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme ? theme.colors.primary : '#345aaa';
  }

  getPreviewAccent(): string {
    const theme = this.themeService.getThemeById(this.selectedThemeId);
    return theme ? theme.colors.accent : '#ff9800';
  }

  async onSubmit() {
    if (this.isFormValid()) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        await this.authService.register(
          this.registerForm.value.email,
          this.registerForm.value.password,
          this.registerForm.value.ime,
          this.registerForm.value.prezime,
          this.registerForm.value.spol,
          this.registerForm.value.datumRodjenja,
          this.selectedThemeId
        );
        // Clear weather and AI insight cache to force fresh API calls on dashboard
        this.weatherService.clearWeatherCache();
        this.aiInsightService.clearInsightCache();
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = error.message || 'Greška pri registraciji';
      } finally {
        this.isLoading = false;
      }
    } else if (!this.selectedThemeId) {
      this.errorMessage = 'Molimo izaberite temu';
    }
  }
}
