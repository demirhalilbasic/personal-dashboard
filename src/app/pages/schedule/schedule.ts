import { Component, OnInit } from '@angular/core';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-schedule',
  imports: [],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit {
  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeService.resetToDefault();
  }
}
