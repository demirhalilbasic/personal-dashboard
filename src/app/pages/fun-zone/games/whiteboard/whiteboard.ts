import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './whiteboard.html',
  styleUrls: ['./whiteboard.css'],
})
export class WhiteboardComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  currentTheme: any;
  currentColor = '#345AAA';
  brushSize = 3;
  isErasing = false;
  private isBrowser: boolean;

  constructor(
    private themeService: ThemeService,
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.currentTheme = this.themeService.getCurrentTheme();
    this.applyTheme();
  }

  private applyTheme() {
    if (!this.isBrowser || !this.currentTheme) return;

    // Apply CSS variables for theme colors
    const root = document.documentElement;
    Object.entries(this.currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });

    // Apply background gradient
    document.body.style.background = `linear-gradient(135deg, ${this.currentTheme.colors.primary} 0%, ${this.currentTheme.colors.secondary} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Set canvas size
    canvas.width = 900;
    canvas.height = 500;

    this.loadDefaultLogo();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    canvas.addEventListener('mouseup', () => this.endDraw());
    canvas.addEventListener('mousemove', (e) => this.draw(e));

    canvas.addEventListener('touchstart', (e) => this.startDraw(e));
    canvas.addEventListener('touchmove', (e) => {
      this.draw(e);
      e.preventDefault();
    });
    canvas.addEventListener('touchend', () => this.endDraw());
  }

  private startDraw(e: MouseEvent | TouchEvent) {
    this.drawing = true;
    this.canvasRef.nativeElement.classList.add('drawing');
    this.draw(e);
  }

  private endDraw() {
    this.drawing = false;
    this.canvasRef.nativeElement.classList.remove('drawing');
    this.ctx.beginPath();
  }

  private draw(e: MouseEvent | TouchEvent) {
    if (!this.drawing) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = (e as MouseEvent).clientX || (e as TouchEvent).touches[0].clientX;
    const clientY = (e as MouseEvent).clientY || (e as TouchEvent).touches[0].clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = this.isErasing ? '#FFFFFF' : this.currentColor;

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  onColorChange() {
    this.isErasing = false;
  }

  toggleEraser() {
    this.isErasing = !this.isErasing;
  }

  clearCanvas() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.loadDefaultLogo();
  }

  saveCanvas() {
    const canvas = this.canvasRef.nativeElement;
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = 'moj_crtez.png';
    link.click();
  }

  private loadDefaultLogo() {
    const img = new Image();
    img.src = 'assets/images/whiteboard/logo-ipi-square.png';

    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      const logoWidth = 200;
      const logoHeight = (img.height / img.width) * logoWidth;
      const x = (canvas.width - logoWidth) / 2;
      const y = (canvas.height - logoHeight) / 2;

      this.ctx.save();
      this.ctx.globalAlpha = 0.5;
      this.ctx.drawImage(img, x, y, logoWidth, logoHeight);
      this.ctx.restore();
    };

    img.onerror = () => {
      console.log('Logo nije pronađen');
    };
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
