import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-button.html',
  styleUrls: ['./back-button.css']
})
export class BackButtonComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
