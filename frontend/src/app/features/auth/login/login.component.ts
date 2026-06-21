import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  @Output() toggleMode = new EventEmitter<void>();

  loginData = {
    email: '',
    password: '',
  };

  errorMessage = '';
  isLoading = false;
  showPassword = false;
  showFaceLogin = false;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.initializeGoogleButton();
  }

  private initializeGoogleButton() {
    const buttonElement = document.getElementById("google-btn");

    if (typeof google !== 'undefined' && buttonElement) {
      try {
        google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: (response: any) => this.handleGoogleLogin(response),
          itp_support: true
        });

        google.accounts.id.renderButton(
          buttonElement,
          {
            theme: "outline",
            size: "large",
            width: 300,
            text: "signin_with",
            shape: "rectangular"
          }
        );
      } catch (error) {
        console.error('Error rendering Google button:', error);
      }
    } else {
      // Retry after a short delay if not yet loaded or element not in DOM
      setTimeout(() => this.initializeGoogleButton(), 100);
    }
  }

  handleGoogleLogin(response: any) {
    const idToken = response.credential;
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin(idToken).subscribe({
      next: (res: any) => {
        if (res?.token) {
          this.authService.setToken(res.token);
        }
        if (res.setupCompleted === false) {
          this.router.navigate(['/setup-account']);
        } else {
          this.processLoginSuccess();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Google login failed. Please try again.';
        console.error('Google login failed', err);
      }
    });
  }

  onLogin() {
    this.isLoading = true;
    this.errorMessage = '';

    const authPayload = {
      email: this.loginData.email,
      username: this.loginData.email,
      password: this.loginData.password,
    };

    this.authService
      .login(authPayload)
      .pipe(
        switchMap((res: any) => {
          if (res?.token) {
            this.authService.setToken(res.token);
          }

          return this.authService.getProfile().pipe(
            switchMap(() => of(res)),
          );
        }),
      )
      .subscribe({
        next: () => {
          this.processLoginSuccess(true);
        },
        error: (err) => {
          this.isLoading = false;
          this.authService.logout();

          const errorUrl = String(err?.url || '');
          if (err?.status === 401 && errorUrl.includes('/authenticate')) {
            this.errorMessage = 'Invalid email or password. Please try again.';
          } else if (err?.status === 401 && errorUrl.includes('/users/me')) {
            this.errorMessage =
              'Login succeeded, but profile access is unauthorized. Please verify backend security for /users/me.';
          } else if (err?.status === 403 && errorUrl.includes('/users/me')) {
            this.errorMessage =
              'Your account is disabled or forbidden. Please contact support.';
          } else if (err?.status === 0 && errorUrl.includes('/users/me')) {
            this.errorMessage =
              'Login succeeded, but /users/me is blocked by CORS/network. Restart frontend with proxy and verify backend is running.';
          } else {
            this.errorMessage = 'Login failed. Please try again in a moment.';
          }

          console.error('Login failed', err);
        },
      });
  }

  onDoctorFaceVerified(): void {
    this.showFaceLogin = false;
    this.processLoginSuccess(false);
  }

  onDoctorFaceVerificationClosed(): void {
    this.showFaceLogin = false;
    this.authService.logout();
    this.errorMessage = 'Face verification is required to sign in as a doctor.';
    this.isLoading = false;
  }

  private requiresDoctorFaceVerification(): boolean {
    const staffRole = this.authService.getStaffRole();
    const normalizedRole = this.authService.getUserRole().toUpperCase();
    const systemRole = (this.authService.getSystemRole() || '').toUpperCase();
    return (
      staffRole === 'DOCTOR' ||
      normalizedRole.includes('DOCTOR') ||
      systemRole.includes('DOCTOR')
    );
  }

  private processLoginSuccess(requireDoctorFaceVerification = false) {
    this.isLoading = false;
    const userInfo = this.authService.getStoredUserInfo();

    // Check if account setup is completed
    if (userInfo && userInfo.setupCompleted === false) {
      this.router.navigate(['/setup-account']);
      return;
    }

    if (requireDoctorFaceVerification && this.requiresDoctorFaceVerification()) {
      this.showFaceLogin = true;
      return;
    }

    const staffRole = this.authService.getStaffRole();
    const normalizedRole = this.authService.getUserRole().toUpperCase();
    const systemRole = (this.authService.getSystemRole() || '').toUpperCase();
    const hasNurseRole =
      staffRole === 'NURSE' ||
      normalizedRole.includes('NURSE') ||
      systemRole.includes('NURSE');

    if (staffRole === 'STAFF_ADMIN') {
      this.router.navigate(['/hospital']);
    } else if (staffRole === 'DOCTOR') {
      this.router.navigate(['/doctor']);
    } else if (hasNurseRole) {
      this.router.navigate(['/nurse']);
    } else {
      const role = normalizedRole;

      if (role === 'HOSPITAL' || role === 'MANAGER') {
        this.router.navigate(['/hospital/dashboard']);
      } else if (role === 'LABO') {
        this.router.navigate(['/lab/dashboard']);
      } else if (role === 'INSURANCE') {
        this.router.navigate(['/insurance/dashboard']);
      } else if (role === 'PHARMACIST') {
      this.router.navigate(['/pharmacist-dashboard']);
      } else if (role === 'DELIVERY_AGENT') {
        this.router.navigate(['/delivery-dashboard']);
      } else if (role === 'ADMIN') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/patient/dashboard']);
      }
    }
  }
}
