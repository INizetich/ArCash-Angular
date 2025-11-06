import { Component, Input } from '@angular/core'; // Importar Input
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { Router } from '@angular/router'; // Importar Router

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-button.html',
  styleUrls: ['./back-button.css']
})
export class BackButtonComponent {
  
  // Input para una ruta explícita. Ej: '/', '/home'
  @Input() explicitRoute: string | null = null;

  constructor(
    private location: Location,
    private router: Router // Inyectar Router
  ) {}

  goBack(): void {
    if (this.explicitRoute) {
      // Si nos dieron una ruta, navegamos a ella
      this.router.navigate([this.explicitRoute]);
    } else {
      // Si no, usamos el comportamiento de siempre
      this.location.back();
    }
  }
}