import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ViewEncapsulation,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../../../services/theme';
import { AuthService } from '../../../../services/auth';

interface BoardItem {
  type: 'note' | 'quote' | 'image';
  className: string;
  html: string;
  left: string;
  top: string;
}

@Component({
  selector: 'app-vision-board',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vision-board.html',
  styleUrls: ['./vision-board.css'],
  encapsulation: ViewEncapsulation.None,
})
export class VisionBoardComponent implements OnInit, AfterViewInit {
  @ViewChild('board', { static: false }) boardElement!: ElementRef<HTMLDivElement>;

  currentTheme: any;

  colors = ['color1', 'color2', 'color3', 'color4', 'color5', 'color6'];
  imageNames = [
    'slika1.jpg',
    'slika2.jpg',
    'slika3.jpg',
    'slika4.jpg',
    'slika5.jpg',
    'slika6.jpg',
    'slika7.jpg',
    'slika8.jpg',
    'slika9.jpg',
    'slika10.jpg',
  ];

  sampleQuotes = [
    '"Svaka dovoljno napredna tehnologija jednaka je magiji." –Arthur C. Clarke',
    '"Tehnologija je riječ koja opisuje nešto što još ne funkcionira." - Douglas Adams',
    '"Ne osnivate zajednice. Zajednice već postoje. Pitanje koje treba postaviti je kako im možete pomoći da budu bolje." – Mark Zuckerberg',
  ];

  private readonly ITEMS_KEY = 'visionBoardItems';
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
    this.loadBoard();
  }

  addNote() {
    const board = this.boardElement.nativeElement;
    const note = document.createElement('div');
    note.className = 'note ' + this.colors[Math.floor(Math.random() * this.colors.length)];
    note.contentEditable = 'true';
    const maxLeft = board.clientWidth - 200;
    const maxTop = board.clientHeight - 200;
    note.style.left = Math.random() * maxLeft + 'px';
    note.style.top = Math.random() * maxTop + 'px';
    note.textContent = 'Napiši nešto...';
    this.makeDraggable(note);
    board.appendChild(note);
  }

  addImage() {
    const board = this.boardElement.nativeElement;
    const div = document.createElement('div');
    div.className = 'pinned-img';
    const maxLeft = board.clientWidth - 200;
    const maxTop = board.clientHeight - 200;
    div.style.left = Math.random() * maxLeft + 'px';
    div.style.top = Math.random() * maxTop + 'px';

    const img = document.createElement('img');
    const chosen = this.imageNames[Math.floor(Math.random() * this.imageNames.length)];
    img.src = `/assets/images/visionboard/${chosen}`;

    div.appendChild(img);
    this.makeDraggable(div);
    board.appendChild(div);
  }

  addQuote() {
    const board = this.boardElement.nativeElement;
    const q = document.createElement('div');
    q.className = 'quote';
    q.textContent = this.sampleQuotes[Math.floor(Math.random() * this.sampleQuotes.length)];
    const maxLeft = board.clientWidth - 300;
    const maxTop = board.clientHeight - 150;
    q.style.left = Math.random() * maxLeft + 'px';
    q.style.top = Math.random() * maxTop + 'px';
    q.contentEditable = 'true';
    this.makeDraggable(q);
    board.appendChild(q);
  }

  saveBoard(silent = false) {
    const board = this.boardElement.nativeElement;
    const items: BoardItem[] = [];

    Array.from(board.children).forEach((el: any) => {
      if (
        el.classList.contains('note') ||
        el.classList.contains('quote') ||
        el.classList.contains('pinned-img')
      ) {
        const data = this.serializeElement(el);
        items.push(data);
      }
    });

    localStorage.setItem(this.ITEMS_KEY, JSON.stringify(items));

    if (!silent) {
      alert('Board saved!');
    }
  }

  clearBoard() {
    if (confirm('Clear the board?')) {
      this.boardElement.nativeElement.innerHTML = '';
      localStorage.removeItem(this.ITEMS_KEY);
    }
  }

  private makeDraggable(el: HTMLElement) {
    let offsetX: number, offsetY: number;

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️';
    delBtn.className = 'delete-btn';
    el.appendChild(delBtn);

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      this.saveBoard(true);
    });

    el.addEventListener('mousedown', (e: MouseEvent) => {
      if ((e.target as HTMLElement) === delBtn) return;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;

      const drag = (e: MouseEvent) => {
        e.preventDefault();
        el.style.left = e.clientX - offsetX + 'px';
        el.style.top = e.clientY - offsetY + 'px';
      };

      const dragEnd = () => {
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
      };

      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);
    });
  }

  private serializeElement(el: HTMLElement): BoardItem {
    return {
      type: el.classList.contains('note')
        ? 'note'
        : el.classList.contains('quote')
        ? 'quote'
        : 'image',
      className: el.className,
      html: el.innerHTML,
      left: el.style.left,
      top: el.style.top,
    };
  }

  private createElementFromData(data: BoardItem): HTMLElement {
    const div = document.createElement('div');
    div.className = data.className;
    div.style.left = data.left;
    div.style.top = data.top;
    div.innerHTML = data.html;

    if (data.type !== 'image') {
      div.contentEditable = 'true';
    }

    this.makeDraggable(div);
    return div;
  }

  private loadBoard() {
    const data = localStorage.getItem(this.ITEMS_KEY);
    if (!data) return;

    try {
      const items: BoardItem[] = JSON.parse(data);
      items.forEach((item) => {
        const div = this.createElementFromData(item);
        this.boardElement.nativeElement.appendChild(div);
      });
    } catch (e) {
      console.error('Error loading board:', e);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
