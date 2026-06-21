import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  AfterViewInit,
  Output,
  ViewChild,
  Input,
} from '@angular/core';
import { FaceAuthService } from '../../../core/services/face-auth.service';

@Component({
  selector: 'app-face-login',
  templateUrl: './face-login.component.html',
  styleUrls: ['./face-login.component.css'],
})
export class FaceLoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @Input() mode: 'register' | 'verify' = 'verify';
  @Input() prefilledEmail = '';
  @Input() lockEmail = false;
  @Output() close = new EventEmitter<void>();
  @Output() verified = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  email = '';
  status = '';
  isLoading = false;
  cameraReady = false;
  private stream: MediaStream | null = null;

  constructor(private faceAuth: FaceAuthService) {}

  async ngAfterViewInit() {
    this.status = 'Loading face models…';
    try {
      await this.faceAuth.loadModels();
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoRef.nativeElement.srcObject = this.stream;
      if (this.prefilledEmail) {
        this.email = this.prefilledEmail;
      }
      this.cameraReady = true;
      this.status =
        this.mode === 'register'
          ? 'Camera ready. Register your face to enable doctor verification.'
          : 'Camera ready. Complete face verification to continue.';
    } catch (err) {
      this.status = 'Could not access camera or load models.';
      console.error(err);
    }
  }

  private validateEmail(): string | null {
    if (!this.email.trim()) {
      this.status = 'Please enter your email first.';
      return null;
    }
    return this.email.trim();
  }

  private async captureDescriptor(): Promise<number[] | null> {
    const descriptor = await this.faceAuth.getDescriptor(this.videoRef.nativeElement);
    if (!descriptor) {
      this.status = 'No face detected. Please look at the camera and try again.';
      this.isLoading = false;
      return null;
    }
    return descriptor;
  }

  private getFriendlyErrorMessage(err: any, flow: 'register' | 'verify'): string {
    const statusCode = Number(err?.status || err?.error?.status || 0);
    const rawMessage = String(
      err?.error?.message || err?.message || err?.error || ''
    ).toLowerCase();

    if (statusCode === 403) {
      return flow === 'register'
        ? 'Face registration is only available for doctors.'
        : 'Face verification is only available for doctors.';
    }

    if (
      statusCode === 401 ||
      rawMessage.includes('does not match') ||
      rawMessage.includes('unauthorized')
    ) {
      return 'Face not recognized. Please align your face and try again.';
    }

    if (statusCode === 0) {
      return 'Connection issue. Please check server availability and try again.';
    }

    return flow === 'register'
      ? 'Face registration failed. Please try again.'
      : 'Face verification failed. Please try again.';
  }

  async registerWithFace() {
    const email = this.validateEmail();
    if (!email) {
      return;
    }

    this.isLoading = true;
    this.status = 'Scanning face for registration…';
    const descriptor = await this.captureDescriptor();
    if (!descriptor) {
      return;
    }

    this.faceAuth.registerFace(email, descriptor).subscribe({
      next: () => {
        this.isLoading = false;
        this.status = 'Face registered successfully.';
        this.registered.emit();
      },
      error: (err) => {
        this.isLoading = false;
        this.status = this.getFriendlyErrorMessage(err, 'register');
        console.error('[FaceAuth][register] backend error:', err);
      },
    });
  }

  async verifyWithFace() {
    const email = this.validateEmail();
    if (!email) {
      return;
    }

    this.isLoading = true;
    this.status = 'Scanning face for login…';
    const descriptor = await this.captureDescriptor();
    if (!descriptor) {
      return;
    }

    this.faceAuth.authenticateFace(email, descriptor).subscribe({
      next: () => {
        this.isLoading = false;
        this.status = 'Face verified successfully.';
        this.verified.emit();
      },
      error: (err) => {
        this.isLoading = false;
        this.status = this.getFriendlyErrorMessage(err, 'verify');
        console.error('[FaceAuth][verify] backend error:', err);
      },
    });
  }

  ngOnDestroy() {
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
