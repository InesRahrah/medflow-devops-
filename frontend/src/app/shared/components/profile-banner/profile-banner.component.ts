import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs';
import { ProfileCompletionService } from '../../../core/services/profile-completion.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-profile-banner',
  templateUrl: './profile-banner.component.html',
  styleUrl: './profile-banner.component.css',
})
export class ProfileBannerComponent implements OnInit, OnDestroy {
  @Output() openWizard = new EventEmitter<void>();

  completionPct = 0;
  isComplete = false;
  visible = false;
  showDismissOptions = false;
  private reShowTimeout?: any;

  private subs: Subscription[] = [];

  constructor(
    private profileService: ProfileCompletionService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.getToken()) return;

    this.subs.push(
      this.profileService.completionPercentage$.subscribe(pct => {
        this.completionPct = pct;
        this.isComplete = pct >= 100;
        this.updateVisibility();
      }),
      this.profileService.showBanner$.subscribe(() => {
        this.updateVisibility();
      })
    );

    this.profileService.refreshCompletion();
    this.profileService.checkBannerStatus();
  }

  private updateVisibility(): void {
    const remaining = this.profileService.getDismissalRemainingTime();
    
    // Clear existing timeout
    if (this.reShowTimeout) {
      clearTimeout(this.reShowTimeout);
      this.reShowTimeout = undefined;
    }

    if (this.isComplete) {
      this.visible = false;
      return;
    }

    if (remaining > 0) {
      this.visible = false;
      // Schedule automatic re-show
      this.reShowTimeout = setTimeout(() => {
        this.profileService.checkBannerStatus();
      }, remaining + 100); // 100ms buffer
    } else {
      this.visible = true;
    }
  }

  toggleDismissOptions(): void {
    this.showDismissOptions = !this.showDismissOptions;
  }

  dismissFor(minutes: number): void {
    this.profileService.dismissBanner(minutes);
    this.showDismissOptions = false;
    this.updateVisibility();
  }

  dismiss(): void {
    // Default fallback if person just clicks outside or similar, 
    // but we'll use toggleDismissOptions for the "Later" button.
    this.toggleDismissOptions();
  }

  onCompleteCta(): void {
    this.openWizard.emit();
  }

  ngOnDestroy(): void {
    if (this.reShowTimeout) {
      clearTimeout(this.reShowTimeout);
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  get circumference(): number {
    return 2 * Math.PI * 18;
  }

  get dashOffset(): number {
    return this.circumference - (this.completionPct / 100) * this.circumference;
  }
}
