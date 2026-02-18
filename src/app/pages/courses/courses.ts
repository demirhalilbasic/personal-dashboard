import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-courses',
  imports: [],
  templateUrl: './courses.html',
  styleUrl: './courses.css',
})
export class Courses implements OnInit {
  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.resetToDefault();
  }
}
