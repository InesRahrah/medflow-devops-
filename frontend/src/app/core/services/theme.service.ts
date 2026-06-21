import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private renderer: Renderer2;
  private readonly THEME_KEY = 'medflow-theme';
  private darkThemeActive = new BehaviorSubject<boolean>(false);
  
  isDarkTheme$ = this.darkThemeActive.asObservable();

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this.initTheme();
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    if (savedTheme === 'dark') {
      this.enableDarkTheme();
    } else if (savedTheme === 'light') {
      this.disableDarkTheme();
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        this.enableDarkTheme();
      }
    }
  }

  public toggleTheme(): void {
    if (this.darkThemeActive.value) {
      this.disableDarkTheme();
    } else {
      this.enableDarkTheme();
    }
  }

  public setDarkTheme(isDark: boolean): void {
    if (isDark) {
      this.enableDarkTheme();
    } else {
      this.disableDarkTheme();
    }
  }

  private enableDarkTheme(): void {
    this.renderer.addClass(document.body, 'dark-theme');
    localStorage.setItem(this.THEME_KEY, 'dark');
    this.darkThemeActive.next(true);
  }

  private disableDarkTheme(): void {
    this.renderer.removeClass(document.body, 'dark-theme');
    localStorage.setItem(this.THEME_KEY, 'light');
    this.darkThemeActive.next(false);
  }
}
