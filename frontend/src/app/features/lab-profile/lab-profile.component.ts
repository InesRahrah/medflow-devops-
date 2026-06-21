import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { LAB_SERVICE_TYPES } from '../../shared/constants/lab-service-types';

@Component({
  selector: 'app-lab-profile',
  templateUrl: './lab-profile.component.html',
  styleUrl: './lab-profile.component.css',
})
export class LabProfileComponent implements OnInit {
  readonly supportedTestOptions: string[] = LAB_SERVICE_TYPES;

  labData: any = {
    profilePictureUrl: '',
    labName: '',
    registrationNumber: '',
    email: '',
    phone: '',
    address: '',
    accreditation: '',
    openingHours: '',
    supportedTests: '',
  };

  isEditing: boolean = false;
  startTime: string = '';
  endTime: string = '';
  showSuccessPopup: boolean = false;
  popupMessage: string = '';
  private popupTimeoutId?: number;
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
        console.error('Error fetching lab profile:', err);
        this.isLoading = false;
        this.loadInitialData();
      },
    });
  }

  loadInitialData(): void {
    const tokenData = this.authService.decodeToken();
    if (tokenData) {
      this.labData.email = tokenData.sub || '';
    }
  }

  mapProfileToData(profile: any): void {
    this.labData.profilePictureUrl = profile.profilePictureUrl || '';
    this.labData.labName = profile.labName || '';
    this.labData.registrationNumber = profile.registrationNumber || '';
    this.labData.email = profile.email || '';
    this.labData.phone = profile.phoneNumber || '';
    this.labData.address = profile.address || '';
    this.labData.accreditation = profile.accreditation || '';
    this.labData.openingHours = profile.openingHours || '';
    this.labData.supportedTests = profile.supportedTests || '';

    const openingHoursParts = this.parseTimeRange(this.labData.openingHours);
    this.startTime = openingHoursParts.start;
    this.endTime = openingHoursParts.end;
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

    const openingHours =
      this.startTime && this.endTime
        ? `${this.startTime} - ${this.endTime}`
        : this.labData.openingHours;

    const updateData = {
      labName: this.labData.labName,
      registrationNumber: this.labData.registrationNumber,
      email: this.labData.email,
      phoneNumber: this.labData.phone,
      address: this.labData.address,
      accreditation: this.labData.accreditation,
      openingHours,
      supportedTests: this.labData.supportedTests,
      role: 'LABO',
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isEditing = false;
        this.submitted = false;
        this.labData.openingHours = openingHours;
        this.popupMessage = this.isLabProfileComplete(response)
          ? 'Your profile is complete.'
          : 'Your profile has been updated.';
        this.showSuccessPopup = true;

        this.clearPopupTimeout();
        this.popupTimeoutId = window.setTimeout(() => {
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

  private isLabProfileComplete(profile: any): boolean {
    const required = [
      'labName',
      'registrationNumber',
      'phoneNumber',
      'address',
      'supportedTests',
      'accreditation',
      'openingHours',
    ];

    return required.every((key) => {
      const value = profile?.[key];
      return (
        value !== undefined && value !== null && String(value).trim() !== ''
      );
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
            this.labData.profilePictureUrl = response.profilePictureUrl;
          }
          this.popupMessage = 'Profile image uploaded successfully.';
          this.showSuccessPopup = true;
          this.clearPopupTimeout();
          this.popupTimeoutId = window.setTimeout(() => {
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
    if (!this.labData.profilePictureUrl) return;

    this.isLoading = true;

    const openingHours =
      this.startTime && this.endTime
        ? `${this.startTime} - ${this.endTime}`
        : this.labData.openingHours;

    const updateData = {
      labName: this.labData.labName,
      registrationNumber: this.labData.registrationNumber,
      email: this.labData.email,
      phoneNumber: this.labData.phone,
      address: this.labData.address,
      accreditation: this.labData.accreditation,
      openingHours,
      supportedTests: this.labData.supportedTests,
      role: 'LABO',
      profilePictureUrl: '',
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response) {
          this.mapProfileToData(response);
          this.labData.profilePictureUrl = '';
        } else {
          this.labData.profilePictureUrl = '';
        }
        this.popupMessage = 'Profile picture removed successfully.';
        this.showSuccessPopup = true;

        this.clearPopupTimeout();
        this.popupTimeoutId = window.setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error removing profile picture:', err);
        alert('Failed to remove profile picture.');
      },
    });
  }

  closePopup(): void {
    this.showSuccessPopup = false;
    this.clearPopupTimeout();
  }

  private clearPopupTimeout(): void {
    if (this.popupTimeoutId !== undefined) {
      clearTimeout(this.popupTimeoutId);
      this.popupTimeoutId = undefined;
    }
  }

  private parseTimeRange(value: string): { start: string; end: string } {
    if (!value) return { start: '', end: '' };

    const parts = value.split(' - ');
    if (parts.length !== 2) {
      return { start: '', end: '' };
    }

    return {
      start: parts[0].trim(),
      end: parts[1].trim(),
    };
  }
}
