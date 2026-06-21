import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-doctor-profile',
  templateUrl: './doctor-profile.component.html',
  styleUrls: ['./doctor-profile.component.css'],
})
export class DoctorProfileComponent implements OnInit {
  doctorData: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    licenseNumber: '',
    yearsOfExperience: null,
    consultationFee: null,
    clinicAddress: '',
    biography: '',
    availabilitySchedule: '',
  };

  /** Holds formatted availability per day */
  formattedAvailability: { day: string; from: string; to: string }[] = [];

  isEditing: boolean = false;
  showSuccessPopup: boolean = false;
  popupMessage: string = '';
  isLoading: boolean = false;
  submitted: boolean = false;
  fieldErrors: Record<string, string> = {};
  startTime: string = '';
  endTime: string = '';

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
          this.initAvailabilityRange();
          this.formatAvailabilitySchedule();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching doctor profile:', err);
        this.isLoading = false;
        this.loadInitialData();
      },
    });
  }

  loadInitialData(): void {
    this.doctorData.firstName = this.authService.getUserFirstName();
    this.doctorData.lastName = this.authService.getUserLastName();
    const tokenData = this.authService.decodeToken();
    if (tokenData) {
      this.doctorData.email = tokenData.sub || '';
    }
  }

  mapProfileToData(profile: any): void {
    this.doctorData.profilePictureUrl = profile.profilePictureUrl || '';
    this.doctorData.firstName = profile.firstName || '';
    this.doctorData.lastName = profile.lastName || '';
    this.doctorData.email = profile.email || '';
    this.doctorData.phone = profile.phoneNumber || '';
    this.doctorData.specialization = profile.specialization || '';
    this.doctorData.licenseNumber = profile.licenseNumber || '';
    this.doctorData.yearsOfExperience = profile.yearsOfExperience;
    this.doctorData.consultationFee = profile.consultationFee;
    this.doctorData.clinicAddress = profile.clinicAddress || profile.address || '';
    this.doctorData.biography = profile.biography || '';
    this.doctorData.availabilitySchedule = profile.availabilitySchedule || '';
    this.formatAvailabilitySchedule();
  }

  /**
   * Parses the availabilitySchedule JSON and sets formattedAvailability
   */
  formatAvailabilitySchedule(): void {
    this.formattedAvailability = [];
    const value = this.doctorData.availabilitySchedule;
    if (!value || typeof value !== 'string') return;

    const jsonSchedule = this.parseAvailabilityJson(value);
    if (jsonSchedule) {
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const keys = Object.keys(jsonSchedule).sort((a, b) => {
        const indexA = dayOrder.indexOf(a.toLowerCase());
        const indexB = dayOrder.indexOf(b.toLowerCase());
        if (indexA === -1 || indexB === -1) {
          return a.localeCompare(b);
        }
        return indexA - indexB;
      });

      for (const day of keys) {
        const slots = jsonSchedule[day];
        if (slots.length > 0) {
          const sorted = [...slots].sort();
          this.formattedAvailability.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            from: sorted[0],
            to: sorted[sorted.length - 1],
          });
        }
      }
      return;
    }

    const parts = value.split(' - ');
    if (parts.length === 2) {
      this.formattedAvailability.push({
        day: 'All days',
        from: parts[0].trim(),
        to: parts[1].trim(),
      });
    }
  }

  private initAvailabilityRange(): void {
    const value = this.doctorData.availabilitySchedule;
    if (!value || typeof value !== 'string') {
      this.startTime = '';
      this.endTime = '';
      return;
    }

    const jsonSchedule = this.parseAvailabilityJson(value);
    if (jsonSchedule) {
      const slots = Object.values(jsonSchedule)
        .flat()
        .filter((slot): slot is string => typeof slot === 'string' && slot.trim() !== '')
        .sort();
      if (slots.length > 0) {
        this.startTime = slots[0] as string;
        this.endTime = slots[slots.length - 1] as string;
        return;
      }
    }

    const parts = value.split(' - ');
    if (parts.length !== 2) {
      this.startTime = '';
      this.endTime = '';
      return;
    }

    this.startTime = parts[0].trim();
    this.endTime = parts[1].trim();
  }

  /**
   * Safely parses a JSON string for availability schedule.
   */
  private parseAvailabilityJson(value: string): Record<string, string[]> | null {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      return Object.entries(parsed).reduce<Record<string, string[]>>((acc, [day, slots]) => {
        if (Array.isArray(slots)) {
          acc[day] = slots.filter((slot) => typeof slot === 'string');
        }
        return acc;
      }, {});
    } catch {
      return null;
    }
  }

  onAvailabilityStartChange(value: string): void {
    this.startTime = value;
    this.syncAvailabilityValue();
  }

  onAvailabilityEndChange(value: string): void {
    this.endTime = value;
    this.syncAvailabilityValue();
  }

  private syncAvailabilityValue(): void {
    if (this.startTime && this.endTime) {
      this.doctorData.availabilitySchedule = `${this.startTime} - ${this.endTime}`;
    } else {
      this.doctorData.availabilitySchedule = '';
    }

    this.formatAvailabilitySchedule();
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
      firstName: this.doctorData.firstName,
      lastName: this.doctorData.lastName,
      email: this.doctorData.email,
      phoneNumber: this.doctorData.phone,
      specialization: this.doctorData.specialization,
      licenseNumber: this.doctorData.licenseNumber,
      yearsOfExperience: this.doctorData.yearsOfExperience,
      consultationFee: this.doctorData.consultationFee,
      clinicAddress: this.doctorData.clinicAddress,
      biography: this.doctorData.biography,
      availabilitySchedule: this.doctorData.availabilitySchedule,
      role: 'DOCTOR',
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
            this.doctorData.profilePictureUrl = response.profilePictureUrl;
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
    if (!this.doctorData.profilePictureUrl) return;

    this.isLoading = true;
    const updateData = {
      firstName: this.doctorData.firstName,
      lastName: this.doctorData.lastName,
      email: this.doctorData.email,
      phoneNumber: this.doctorData.phone,
      specialization: this.doctorData.specialization,
      licenseNumber: this.doctorData.licenseNumber,
      yearsOfExperience: this.doctorData.yearsOfExperience,
      consultationFee: this.doctorData.consultationFee,
      clinicAddress: this.doctorData.clinicAddress,
      biography: this.doctorData.biography,
      availabilitySchedule: this.doctorData.availabilitySchedule,
      role: 'DOCTOR',
      profilePictureUrl: ''
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response) {
          this.mapProfileToData(response);
          this.doctorData.profilePictureUrl = '';
        } else {
          this.doctorData.profilePictureUrl = '';
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
}
