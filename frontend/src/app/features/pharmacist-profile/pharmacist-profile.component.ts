import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-pharmacist-profile',
  templateUrl: './pharmacist-profile.component.html',
  styleUrl: './pharmacist-profile.component.css',
})
export class PharmacistProfileComponent implements OnInit {
  pharmacistData: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    specialization: '',
    biography: '',
  };

  isEditing: boolean = false;
  showSuccessPopup: boolean = false;
  popupMessage: string = '';
  isLoading: boolean = false;
  submitted: boolean = false;
  fieldErrors: Record<string, string> = {};

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  isFieldInvalid(form: NgForm, fieldName: string): boolean {
    if (this.fieldErrors && this.fieldErrors[fieldName]) {
      return true;
    }
    const control = form.controls[fieldName];
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  getFieldError(form: NgForm, fieldName: string, label: string): string {
    if (this.fieldErrors && this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }
    if (!form || !form.controls) return '';
    const control = form.controls[fieldName];
    if (!control?.errors) return '';

    if (control.errors['required']) return `${label} is required.`;
    if (control.errors['email']) return 'Invalid email format.';
    if (control.errors['min'])
      return `${label} must be at least ${control.errors['min'].min}.`;

    return `Invalid ${label.toLowerCase()}.`;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.mapProfileToData(profile);
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching pharmacist profile:', err);
        this.isLoading = false;
        this.loadInitialData();
      },
    });
  }

  loadInitialData(): void {
    this.pharmacistData.firstName = this.authService.getUserFirstName();
    this.pharmacistData.lastName = this.authService.getUserLastName();
    const tokenData = this.authService.decodeToken();
    if (tokenData) {
      this.pharmacistData.email = tokenData.sub || '';
    }
  }

  mapProfileToData(profile: any): void {
    this.pharmacistData.profilePictureUrl = profile.profilePictureUrl || '';
    this.pharmacistData.firstName = profile.firstName || '';
    this.pharmacistData.lastName = profile.lastName || '';
    this.pharmacistData.email = profile.email || '';
    this.pharmacistData.phone = profile.phoneNumber || '';
    this.pharmacistData.licenseNumber = profile.licenseNumber || '';
    this.pharmacistData.specialization = profile.specialization || '';
    this.pharmacistData.biography = profile.biography || '';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  saveProfile(form: NgForm): void {
    this.submitted = true;
    this.fieldErrors = {};

    if (form.invalid) {
      Object.values(form.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    this.isLoading = true;

    const updateData = {
      firstName: this.pharmacistData.firstName,
      lastName: this.pharmacistData.lastName,
      email: this.pharmacistData.email,
      phoneNumber: this.pharmacistData.phone,
      licenseNumber: this.pharmacistData.licenseNumber,
      specialization: this.pharmacistData.specialization,
      biography: this.pharmacistData.biography,
      role: 'PHARMACIST',
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isEditing = false;
        this.submitted = false;
        this.popupMessage = 'Your profile has been updated.';
        this.showSuccessPopup = true;

        setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.fieldErrors = this.authService.getValidationErrors(err);

        console.error('Error updating profile:', err);

        if (err?.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }

        if (Object.keys(this.fieldErrors).length === 0) {
          alert('Failed to update profile. Please try again.');
        }
      },
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.isLoading = true;
      this.authService.uploadProfileImage(file).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response && response.profilePictureUrl) {
            this.pharmacistData.profilePictureUrl = response.profilePictureUrl;
          }
          this.popupMessage = 'Profile image uploaded successfully.';
          this.showSuccessPopup = true;
          setTimeout(() => {
            this.showSuccessPopup = false;
          }, 3000);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error uploading image', err);
          alert('Failed to upload image.');
        },
      });
    }
  }
}