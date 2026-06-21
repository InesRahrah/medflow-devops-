import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'MedFlow';

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}
}
