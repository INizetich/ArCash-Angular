import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// Importar componentes
import { ThemeToggleComponent } from '../../components/ui/theme-toggle/theme-toggle';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    ThemeToggleComponent
    
],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

  constructor(private router: Router) {}

  ngOnInit(): void {}

  goTo(path: string): void {
    this.router.navigate([`/${path}`]);
  }
}
