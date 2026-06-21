import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-hospital-profile',
  templateUrl: './hospital-profile.component.html',
  styleUrl: './hospital-profile.component.css',
})
export class HospitalProfileComponent implements OnInit {
  userProfile: any = {
    profilePictureUrl: '',
    name: '',
    registrationNumber: '',
    email: '',
    phone: '',
    address: '',
    hospitalType: '',
  };
  userInitial: string = 'H';
  isEditing: boolean = false;
  showSuccessPopup: boolean = false;
  popupMessage: string = '';
  isLoading: boolean = false;
  submitted: boolean = false;
  fieldErrors: Record<string, string> = {};

  readonly hospitalTypeOptions = [
    { label: 'Public', value: 'PUBLIC' },
    { label: 'Private', value: 'PRIVATE' },
    { label: 'Clinic', value: 'CLINIC' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

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
        console.error('Error fetching hospital profile:', err);
        this.isLoading = false;
        this.loadInitialData();
      },
    });
  }

  loadInitialData(): void {
    const tokenData = this.authService.decodeToken();
    if (tokenData) {
      this.userProfile.email =
        tokenData.email ||
        this.authService.getStoredUserInfo()?.email ||
        (typeof tokenData.sub === 'string' && tokenData.sub.includes('@') ? tokenData.sub : '');
    }
    this.userInitial = 'H';
  }

  mapProfileToData(profile: any): void {
    this.userProfile.profilePictureUrl = profile.profilePictureUrl || '';
    this.userProfile.name = profile.name || '';
    this.userProfile.registrationNumber = profile.registrationNumber || '';
    this.userProfile.email = profile.email || '';
    this.userProfile.phone = profile.phone || profile.phoneNumber || '';
    this.userProfile.address = profile.address || '';
    this.userProfile.hospitalType = profile.hospitalType || profile.type || '';
    this.userInitial = this.userProfile.name
      ? this.userProfile.name.charAt(0).toUpperCase()
      : 'H';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

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

    // Based on HospitalRequest dto
    const updateData = {
      name: this.userProfile.name,
      registrationNumber: this.userProfile.registrationNumber,
      phoneNumber: this.userProfile.phone,
      address: this.userProfile.address,
      hospitalType: this.userProfile.hospitalType,
      email: this.userProfile.email,
      role: 'HOSPITAL',
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

        console.error('Error updating hospital profile:', err);

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
            this.userProfile.profilePictureUrl = response.profilePictureUrl;
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

  removeProfilePicture(): void {
    if (!this.userProfile.profilePictureUrl) return;

    this.isLoading = true;
    const updateData = {
      name: this.userProfile.name,
      registrationNumber: this.userProfile.registrationNumber,
      phoneNumber: this.userProfile.phone,
      address: this.userProfile.address,
      hospitalType: this.userProfile.hospitalType,
      email: this.userProfile.email,
      role: 'HOSPITAL',
      profilePictureUrl: ''
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response) {
          this.mapProfileToData(response);
          this.userProfile.profilePictureUrl = '';
        } else {
          this.userProfile.profilePictureUrl = '';
        }
        this.popupMessage = 'Profile picture removed successfully.';
        this.showSuccessPopup = true;
        setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error removing profile picture:', err);
        alert('Failed to remove profile picture.');
      }
    });
  }

  closePopup(): void {
    this.showSuccessPopup = false;
  }
}
