import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact implements OnInit {
  contactForm!: FormGroup;
  showSuccess = false;
  detectedCountry: string | null = null;

  private countryMap = [
    { code: '387', name: 'Bosna i Hercegovina', flag: '🇧🇦' },
    { code: '381', name: 'Srbija', flag: '🇷🇸' },
    { code: '385', name: 'Hrvatska', flag: '🇭🇷' },
    { code: '382', name: 'Crna Gora', flag: '🇲🇪' },
    { code: '389', name: 'Sjeverna Makedonija', flag: '🇲🇰' },
    { code: '386', name: 'Slovenija', flag: '🇸🇮' },
    { code: '355', name: 'Albanija', flag: '🇦🇱' },
    { code: '49', name: 'Njemačka', flag: '🇩🇪' },
    { code: '43', name: 'Austrija', flag: '🇦🇹' },
    { code: '41', name: 'Švicarska', flag: '🇨🇭' },
    { code: '39', name: 'Italija', flag: '��🇹' },
    { code: '33', name: 'Francuska', flag: '🇫🇷' },
    { code: '34', name: 'Španija', flag: '🇪🇸' },
    { code: '44', name: 'Ujedinjeno Kraljevstvo', flag: '🇬🇧' },
    { code: '1', name: 'SAD / Kanada', flag: '🇺🇸' },
  ].sort((a, b) => b.code.length - a.code.length);

  constructor(
    private fb: FormBuilder,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.resetToDefault();
    this.contactForm = this.fb.group({
      ime: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[A-Za-zÀ-ž\-'\s]{2,}$/),
        ],
      ],
      prezime: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.pattern(/^[A-Za-zÀ-ž\-'\s]{2,}$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      telefon: ['', [Validators.required, Validators.pattern(/^(\+|00)?[0-9()\s\-]{7,20}$/)]],
      poruka: ['', [Validators.required, Validators.minLength(10)]],
    });

    this.contactForm.get('telefon')?.valueChanges.subscribe((value: string) => {
      this.detectCountry(value);
    });
  }

  detectCountry(phoneNumber: string): void {
    if (!phoneNumber) {
      this.detectedCountry = null;
      return;
    }

    let sanitized = phoneNumber.replace(/[^0-9+]/g, '');

    if (sanitized.startsWith('00')) {
      sanitized = '+' + sanitized.slice(2);
    } else if (!sanitized.startsWith('+') && /^[1-9]/.test(sanitized)) {
      sanitized = '+' + sanitized;
    }

    if (!sanitized.startsWith('+')) {
      this.detectedCountry = null;
      return;
    }

    const digits = sanitized.slice(1);

    for (const country of this.countryMap) {
      if (digits.startsWith(country.code)) {
        this.detectedCountry = country.flag + ' ' + country.name + ' (+' + country.code + ')';
        return;
      }
    }

    this.detectedCountry = null;
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      console.log('Kontakt forma:', this.contactForm.value);
      this.showSuccess = true;
      setTimeout(() => {
        this.showSuccess = false;
      }, 5000);
      this.contactForm.reset();
      this.detectedCountry = null;
    } else {
      Object.keys(this.contactForm.controls).forEach((key) => {
        this.contactForm.get(key)?.markAsTouched();
      });
    }
  }
}
