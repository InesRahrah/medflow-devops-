import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';
    const { email, password } = this.loginForm.value;

    const authPayload = {
      email: email,
      username: email,
      password: password
    };

    this.authService.login(authPayload).subscribe({
      next: (res) => {
        if (res?.token) {
          this.authService.setToken(res.token);
        }
        
        this.authService.getProfile().subscribe({
          next: () => {
            const role = this.authService.getUserRole();
            if (role === 'ADMIN') {
              this.router.navigate(['/admin/dashboard']);
            } else {
              this.errorMessage = 'Unauthorized access. Only admins can login here.';
              this.authService.logout();
            }
            this.loading = false;
          },
          error: () => {
            this.errorMessage = 'Failed to fetch admin profile';
            this.authService.logout();
            this.loading = false;
          }
        });
      },
      error: (err) => {
        this.errorMessage = 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}
