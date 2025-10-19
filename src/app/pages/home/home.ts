import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { themeService } from '../../services/theme-service/theme-service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

constructor(private router: Router, public themeService : themeService){}

ngOnInit(): void {
}

goTo(path: string){
  this.router.navigate([`/${path}`])
}

toggleTheme(){
  this.themeService.toggleTheme();
}

}
