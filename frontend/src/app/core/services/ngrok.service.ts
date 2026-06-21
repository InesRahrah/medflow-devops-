import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NgrokService {
  // Store ngrok URL in a BehaviorSubject for dynamic updates
  private ngrokUrlSubject = new BehaviorSubject<string>(this.getStoredUrl());
  public ngrokUrl$: Observable<string> = this.ngrokUrlSubject.asObservable();

  constructor() {
    this.initializeUrl();
  }

  /**
   * Initialize the ngrok URL from environment or localStorage
   */
  private initializeUrl(): void {
    const storedUrl = this.getStoredUrl();
    if (storedUrl) {
      this.ngrokUrlSubject.next(storedUrl);
    } else {
      // Default to window.location.origin
      const defaultUrl = window.location.origin;
      this.setNgrokUrl(defaultUrl);
    }
  }

  /**
   * Get the current ngrok URL
   */
  getNgrokUrl(): string {
    return this.ngrokUrlSubject.getValue();
  }

  /**
   * Set a new ngrok URL (update dynamically)
   */
  setNgrokUrl(url: string): void {
    if (url && url.trim()) {
      // Ensure URL doesn't have trailing slash
      const cleanUrl = url.replace(/\/$/, '');
      this.ngrokUrlSubject.next(cleanUrl);
      // Persist to localStorage
      localStorage.setItem('ngrok_url', cleanUrl);
    }
  }

  /**
   * Get ngrok URL from localStorage
   */
  private getStoredUrl(): string {
    return localStorage.getItem('ngrok_url') || '';
  }

  /**
   * Get QR code data URL
   * Combines ngrok URL with the drug path
   */
  getQRCodeUrl(drugId: string | number): string {
    const baseUrl = this.getNgrokUrl();
    return `${baseUrl}/drug/${drugId}`;
  }

  /**
   * Clear stored ngrok URL and reset to default
   */
  resetToDefault(): void {
    const defaultUrl = window.location.origin;
    this.setNgrokUrl(defaultUrl);
  }

  /**
   * Check if using ngrok URL
   */
  isUsingNgrok(): boolean {
    const url = this.getNgrokUrl();
    return url.includes('ngrok');
  }
}
