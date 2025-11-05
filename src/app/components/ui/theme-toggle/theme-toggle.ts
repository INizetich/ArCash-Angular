import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { themeService } from '../../../services/theme-service/theme-service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.html',
  styleUrls: ['./theme-toggle.css']
})
export class ThemeToggleComponent {
  constructor(private themeService: themeService) {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
