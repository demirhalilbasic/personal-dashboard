import { Component, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth';
import { WeatherService } from '../../../services/weather';
import { AIInsightService } from '../../../services/ai-insight';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private weatherService: WeatherService,
    private aiInsightService: AIInsightService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, this.emailDomainValidator]],
      password: ['', [Validators.required]],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  emailDomainValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const email = control.value;
    if (email && !email.endsWith('@ipi-akademija.ba')) {
      return { invalidDomain: true };
    }
    return null;
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      try {
        await this.authService.login(this.loginForm.value.email, this.loginForm.value.password);
        // Clear weather and AI insight cache to force fresh API calls on dashboard
        this.weatherService.clearWeatherCache();
        this.aiInsightService.clearInsightCache();
        this.router.navigate(['/dashboard']);
      } catch (error: any) {
        this.errorMessage = error.message || 'Greška pri prijavi';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }
}
