import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { themeService } from '../../services/theme-service/theme-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-error-404',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-404.html',
  styleUrls: ['./error-404.css']
})
export class Error404Component implements OnDestroy {
  
  currentTheme: string = 'light';
  private themeSubscription: Subscription;

  constructor(
    private router: Router,
    private themeService: themeService
  ) {
    // Suscribirse a los cambios de tema
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }
}
