import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';

import { AppointmentService, PenaltyProfile, PenaltyProfileEvent } from '../../core/services/appointment.service';
import { BlogService } from '../blogs/services/blog.service';
import { BlogRepostService } from '../blogs/services/blog-repost.service';


@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.css',
})
export class PatientProfileComponent implements OnInit {

    formatEventType(eventType: string): string {
      return (eventType || '').replace(/_/g, ' ');
    }

  // ── Patient data ───────────────────────────────────────
  patientData: any = {
    role: 'PATIENT',
    profilePictureUrl: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: '',
    chronicDiseases: '',
    height: null,
    weight: null,
    emergencyContactName: '',
    emergencyContactPhone: '',
  };

  isEditing = false;
  showSuccessPopup = false;
  popupMessage = '';
  isLoading = false;
  isCodeLoading = false;
  isCodeRegenerating = false;
  submitted = false;
  fieldErrors: Record<string, string> = {};
  patientAccessCode = '';

  // ── Tabs + articles + reposts ──────────────────────────
  activeTab = 'info';
  suggestedArticles: any[] = [];
  articlesLoading = false;
  reposts: any[] = [];
  repostsLoading = false;

  readonly genderOptions = [
    { label: 'Male',   value: 'MALE'   },
    { label: 'Female', value: 'FEMALE' },
  ];

  readonly bloodTypeOptions = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-',
  ];

  penaltyProfile: PenaltyProfile | null = null;
  penaltyLoading = false;
  penaltyError = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private appointmentService: AppointmentService,
    private blogService: BlogService,
    private repostService: BlogRepostService
  ) {}


  // ── Tab switching ──────────────────────────────────────
setTab(tab: string): void {
  this.activeTab = tab;
  if (tab === 'reposts' && this.reposts.length === 0 && !this.repostsLoading) {
    this.loadReposts();
  }
}
  // ── Token helper ───────────────────────────────────────
  private getUserId(): string | null {
    const raw = localStorage.getItem('auth_token');
    if (!raw) return null;
    try {
      const payload = JSON.parse(atob(raw.split('.')[1]));
      return payload.sub || null;
    } catch {
      return null;
    }
  }

  // ── Form helpers ───────────────────────────────────────
  isFieldInvalid(form: NgForm, fieldName: string): boolean {
    if (this.fieldErrors && this.fieldErrors[fieldName]) return true;
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
    if (control.errors['email'])    return 'Invalid email format.';
    if (control.errors['min'])
      return `${label} must be at least ${control.errors['min'].min}.`;
    return `Invalid ${label.toLowerCase()}.`;
  }

  ngOnInit(): void {
    if (!this.authService.getToken()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
    this.loadAccessCode();

    this.fetchPenaltyProfile();
  }

  fetchPenaltyProfile(): void {
    this.penaltyLoading = true;
    this.penaltyError = '';
    const patientId = this.authService.getUserId?.() || this.authService.decodeToken?.()?.userId || this.authService.decodeToken?.()?.sub;
    if (!patientId) {
      this.penaltyLoading = false;
      this.penaltyError = 'Could not determine patient ID.';
      return;
    }
    this.appointmentService.getPatientPenaltyProfile(patientId).subscribe({
      next: (profile) => {
        this.penaltyProfile = profile;
        this.penaltyLoading = false;
      },
      error: (err: any) => {
        this.penaltyError = 'Failed to load penalty profile.';
        this.penaltyLoading = false;
      }
    });
  }


  loadAccessCode(): void {
    this.isCodeLoading = true;
    this.authService.getMyAccessCode().subscribe({
      next: (response) => {
        this.patientAccessCode = response?.code || '';
        this.isCodeLoading = false;
      },
      error: (err) => {
        console.error('Error loading access code:', err);
        this.isCodeLoading = false;
      },
    });
  }

  regenerateAccessCode(): void {
    this.isCodeRegenerating = true;
    this.authService.regenerateMyAccessCode().subscribe({
      next: (response) => {
        this.patientAccessCode = response?.code || '';
        this.isCodeRegenerating = false;
        this.popupMessage = 'Patient code regenerated successfully.';
        this.showSuccessPopup = true;
        setTimeout(() => {
          this.showSuccessPopup = false;
        }, 3000);
      },
      error: (err) => {
        this.isCodeRegenerating = false;
        console.error('Error regenerating access code:', err);
        alert('Failed to regenerate patient code. Please try again.');
      },
    });
  }

  copyAccessCode(): void {
    if (!this.patientAccessCode) {
      return;
    }

    navigator.clipboard.writeText(this.patientAccessCode).then(() => {
      this.popupMessage = 'Patient code copied.';
      this.showSuccessPopup = true;
      setTimeout(() => {
        this.showSuccessPopup = false;
      }, 2000);
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) this.mapProfileToData(profile);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching profile:', err);
        this.isLoading = false;
        if (err?.status === 401) {
          this.router.navigate(['/login']);
          return;
        }
        this.loadInitialData();
      },
    });
  }

  loadInitialData(): void {
    this.patientData.role      = this.authService.getUserRole() || 'PATIENT';
    this.patientData.firstName = this.authService.getUserFirstName() || 'Patient';
    this.patientData.lastName  = this.authService.getUserLastName();

    const profile   = this.authService.getStoredUserInfo();
    const tokenData = this.authService.decodeToken();

    this.patientData.email =
      profile?.email || profile?.user?.email ||
      tokenData?.email || tokenData?.sub || '';

    this.patientData.phone =
      profile?.phone || profile?.phoneNumber ||
      profile?.mobile || profile?.user?.phone || '';
  }

  mapProfileToData(profile: any): void {
    this.patientData.role                 = profile.role || this.authService.getUserRole() || 'PATIENT';
    this.patientData.profilePictureUrl    = profile.profilePictureUrl || '';
    this.patientData.firstName            = profile.firstName || '';
    this.patientData.lastName             = profile.lastName || '';
    this.patientData.email                = profile.email || '';
    this.patientData.phone                = profile.phoneNumber || '';
    this.patientData.dateOfBirth          = profile.dateOfBirth || '';
    this.patientData.gender               = profile.gender || '';
    this.patientData.bloodType            = profile.bloodType || '';
    this.patientData.allergies            = profile.allergies || '';
    this.patientData.chronicDiseases      = profile.chronicDiseases || '';
    this.patientData.height               = profile.height;
    this.patientData.weight               = profile.weight;
    this.patientData.emergencyContactName  = profile.emergencyContactName || '';
    this.patientData.emergencyContactPhone = profile.emergencyContactPhone || '';
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
  }

  private toNullableNumber(value: any): number | null {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  saveProfile(form: NgForm): void {
    this.submitted   = true;
    this.fieldErrors = {};

    if (form.invalid) {
      Object.values(form.controls).forEach((c) => c.markAsTouched());
      return;
    }

    this.isLoading = true;

    const updateData = {
      role:                   this.patientData.role || 'PATIENT',
      firstName:              this.patientData.firstName,
      lastName:               this.patientData.lastName,
      email:                  this.patientData.email || this.authService.decodeToken()?.sub,
      phoneNumber:            this.patientData.phone,
      dateOfBirth:            this.patientData.dateOfBirth,
      gender:                 this.patientData.gender,
      bloodType:              this.patientData.bloodType,
      allergies:              this.patientData.allergies,
      chronicDiseases:        this.patientData.chronicDiseases,
      height:                 this.toNullableNumber(this.patientData.height),
      weight:                 this.toNullableNumber(this.patientData.weight),
      emergencyContactName:   this.patientData.emergencyContactName,
      emergencyContactPhone:  this.patientData.emergencyContactPhone,
    };

    this.authService.updateProfile(updateData).subscribe({
      next: (response) => {
        this.isLoading  = false;
        this.isEditing  = false;
        this.submitted  = false;
        if (response) this.mapProfileToData(response);
        this.popupMessage    = 'Your profile has been updated.';
        this.showSuccessPopup = true;
        setTimeout(() => (this.showSuccessPopup = false), 3000);
      },
      error: (err) => {
        this.isLoading   = false;
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
    if (!file) return;
    this.isLoading = true;
    this.authService.uploadProfileImage(file).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response?.profilePictureUrl) {
          this.patientData.profilePictureUrl = response.profilePictureUrl;
        }
        this.popupMessage    = 'Profile image uploaded successfully.';
        this.showSuccessPopup = true;
        setTimeout(() => (this.showSuccessPopup = false), 3000);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error uploading image', err);
        alert('Failed to upload image.');
      },
    });
  }

  // ── Suggested Articles ─────────────────────────────────
  loadSuggestedArticles(): void {
    this.articlesLoading = true;
    this.blogService.getAll().subscribe({
      next: (blogs: any[]) => {
        this.suggestedArticles = blogs
          .filter((b) => b.status === 'PUBLISHED')
          .slice(0, 4);
        this.articlesLoading = false;
      },
      error: () => { this.articlesLoading = false; }
    });
  }

  // ── Reposts ────────────────────────────────────────────
  loadReposts(): void {
    const userId = this.getUserId();
    if (!userId) return;

    this.repostsLoading = true;
    this.repostService.getPatientReposts(userId).subscribe({
      next: (data: any[]) => {
        this.reposts        = data;
        this.repostsLoading = false;
      },
      error: (err) => {
        console.error('[PatientProfile] loadReposts failed:', err);
        this.repostsLoading = false;
      }
    });
  }

removeRepost(repost: any): void {
  const userId = this.getUserId();
  if (!userId) return;

  this.repostService.removeRepost(repost.blogId, userId).subscribe({
    next: () => {
      this.reposts = this.reposts.filter((r: any) => r.id !== repost.id);
    },
    error: (err) => console.error('Failed to remove repost', err)
  });
}
updateRepostVisibility(repost: any, visibility: string): void {
  const userId = this.getUserId() ?? '';
  this.repostService.updateRepostVisibility(repost.id, visibility, userId).subscribe({
    next: (updated: any) => {
      repost.visibility = updated.visibility;
      this.popupMessage = `Visibility set to ${visibility.toLowerCase()}.`;
      this.showSuccessPopup = true;
      setTimeout(() => (this.showSuccessPopup = false), 2500);
    },
    error: (err) => console.error('Failed to update visibility', err)
  });
}
  goToBlogs(): void {
    this.router.navigate(['/blogs']);
  }

  showAllReposts = false;

get visibleReposts(): any[] {
  return this.showAllReposts ? this.reposts : this.reposts.slice(0, 4);
}
}