import { Component } from '@angular/core';
import { Router } from '@angular/router';

// Importar componentes
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-error-404',
  standalone: true,
  imports: [ThemeToggleComponent],
  templateUrl: './error-404.html',
  styleUrls: ['./error-404.css']
})
export class Error404Component {

  constructor(private router: Router) {}

  goToHome(): void {
    this.router.navigate(['/']);
  }
}
