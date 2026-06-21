import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PreconsultationService } from '../../../core/services/preconsultation.service';

@Component({
  selector: 'app-preconsultation-setup-banner',
  templateUrl: './preconsultation-setup-banner.component.html',
  styleUrl: './preconsultation-setup-banner.component.css',
})
export class PreconsultationSetupBannerComponent implements OnInit, OnDestroy {
  @Output() openSetup = new EventEmitter<void>();

  visible = false;
  isLoading = true;

  private readonly subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private preconsultationService: PreconsultationService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.getToken() || this.authService.getUserRole() !== 'DOCTOR') {
      this.isLoading = false;
      this.visible = false;
      return;
    }

    this.subscription.add(
      this.preconsultationService.getMyTemplate().subscribe({
        next: (template) => {
          this.visible = !template || template.questions.length === 0;
          this.isLoading = false;
        },
        error: () => {
          this.visible = false;
          this.isLoading = false;
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onOpenSetup(): void {
    this.openSetup.emit();
  }
}