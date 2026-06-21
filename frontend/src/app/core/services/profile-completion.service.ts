import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface WizardStep {
  id: string;
  label: string;
  icon: string;
  fields: WizardField[];
}

export interface WizardField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'select'
    | 'textarea'
    | 'availability';
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  maxlength?: number;
  pattern?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  private completionPercentage = new BehaviorSubject<number>(0);
  private missingFieldsList = new BehaviorSubject<string[]>([]);
  private profileData = new BehaviorSubject<any>({});
  private wizardDraftKey = 'medflow_wizard_draft';
  private bannerDismissedAtKey = 'profileBannerDismissedAt';
  private bannerDismissDurationKey = 'profileBannerDismissDuration';

  private showBannerSubject = new BehaviorSubject<boolean>(true);

  completionPercentage$ = this.completionPercentage.asObservable();
  isComplete$ = this.completionPercentage$.pipe(map((p) => p >= 100));
  missingFields$ = this.missingFieldsList.asObservable();
  profileData$ = this.profileData.asObservable();
  showBanner$ = this.showBannerSubject.asObservable();

  constructor(private authService: AuthService) {}

  /** Fetch profile from backend and compute completion */
  refreshCompletion(): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile) {
          this.profileData.next(profile);
          this.computeCompletion(profile);
        }
      },
      error: () => {
        // Fallback to stored info
        const stored = this.authService.getStoredUserInfo();
        if (stored && Object.keys(stored).length > 0) {
          this.profileData.next(stored);
          this.computeCompletion(stored);
        }
      },
    });
  }

  /** Compute completion from already-loaded profile data */
  computeFromStoredProfile(): void {
    const stored = this.authService.getStoredUserInfo();
    if (stored && Object.keys(stored).length > 0) {
      this.profileData.next(stored);
      this.computeCompletion(stored);
    }
  }

  private computeCompletion(profile: any): void {
    const role = this.authService.getUserRole();
    const requiredFields = this.getRequiredFieldKeys(role);
    if (requiredFields.length === 0) {
      this.completionPercentage.next(100);
      this.missingFieldsList.next([]);
      return;
    }

    const missing: string[] = [];
    for (const key of requiredFields) {
      const val = this.getFieldValueWithAliases(profile, key);
      if (val === undefined || val === null || val === '') {
        missing.push(key);
      }
    }

    const filled = requiredFields.length - missing.length;
    const pct = Math.round((filled / requiredFields.length) * 100);
    this.completionPercentage.next(pct);
    this.missingFieldsList.next(missing);
  }

  private getRequiredFieldKeys(role: string): string[] {
    switch (role) {
      case 'PATIENT':
        return [
          'firstName',
          'lastName',
          'phoneNumber',
          'dateOfBirth',
          'gender',
          'bloodType',
          'allergies',
          'chronicDiseases',
          'height',
          'weight',
          'emergencyContactName',
          'emergencyContactPhone',
        ];
      case 'DOCTOR':
        return [
          'firstName',
          'lastName',
          'phoneNumber',
          'specialization',
          'licenseNumber',
          'yearsOfExperience',
          'consultationFee',
          'clinicAddress',
          'biography',
          'availabilitySchedule',
        ];
      case 'HOSPITAL':
      case 'MANAGER':
        return [
          'name',
          'phoneNumber',
          'address',
          'hospitalType',
          'registrationNumber',
        ];
      case 'LABO':
        return [
          'labName',
          'phoneNumber',
          'address',
          'supportedTests',
          'registrationNumber',
          'accreditation',
          'openingHours',
        ];
      case 'INSURANCE':
        return [
          'companyName',
          'phoneNumber',
          'registrationNumber',
          'coverageTypes',
        ];
       case 'PHARMACIST':
        return [
          'firstName',
          'lastName',
          'phoneNumber',
          'licenseNumber',
          'region'
        ];

     case 'DELIVERY_AGENT':
  return [
    'deliveryName',
    'phoneNumber',
    'vehicleType'
  ]; 
      case 'CENTRAL_PHARMACY':
        return ['phoneNumber'];
      default:
        return ['firstName', 'lastName', 'phoneNumber'];
    }
  }

  private getFieldValueWithAliases(profile: any, key: string): any {
    if (!profile) return undefined;

    if (key === 'hospitalType') {
      return profile.hospitalType ?? profile.type;
    }

    if (key === 'phoneNumber') {
      return profile.phoneNumber ?? profile.phone;
    }

    if (key === 'clinicAddress') {
      return profile.clinicAddress ?? profile.address;
    }

    return profile[key];
  }

  /** Return wizard steps tailored to the user's role */
  getStepsForRole(role: string): WizardStep[] {
    const isCorporate = ['HOSPITAL', 'MANAGER', 'LABO', 'INSURANCE', 'DELIVERY_AGENT', 'PHARMACIST', 'CENTRAL_PHARMACY'].includes(
      role,
    );

    const personalStep: WizardStep = {
      id: 'personal',
      label: 'Personal Info',
      icon: 'ðŸ‘¤',
      fields: [
        {
          key: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your first name',
        },
        {
          key: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
          placeholder: 'Enter your last name',
        },
      ],
    };

    const contactStep: WizardStep = {
      id: 'contact',
      label: 'Contact Info',
      icon: 'ðŸ“ž',
      fields: [
        {
          key: 'phoneNumber',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          placeholder: '+1 (555) 000-0000',
        },
      ],
    };

    const roleStep = this.getRoleSpecificStep(role);

    const confirmStep: WizardStep = {
      id: 'confirm',
      label: 'Confirmation',
      icon: 'âœ…',
      fields: [],
    };

    if (isCorporate) {
      return [contactStep, roleStep, confirmStep];
    }
    return [personalStep, contactStep, roleStep, confirmStep];
  }

  private getRoleSpecificStep(role: string): WizardStep {
    switch (role) {
      case 'PATIENT':
        return {
          id: 'role',
          label: 'Medical Info',
          icon: 'ðŸ¥',
          fields: [
            {
              key: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
            },
            {
              key: 'gender',
              label: 'Gender',
              type: 'select',
              required: true,
              options: [
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
              ],
            },
            {
              key: 'bloodType',
              label: 'Blood Type',
              type: 'select',
              required: true,
              options: [
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
              ],
            },
            {
              key: 'height',
              label: 'Height (cm)',
              type: 'number',
              required: true,
              placeholder: '170',
              min: 50,
            },
            {
              key: 'weight',
              label: 'Weight (kg)',
              type: 'number',
              required: true,
              placeholder: '70',
              min: 2.5,
            },
            {
              key: 'allergies',
              label: 'Allergies',
              type: 'textarea',
              required: false,
              placeholder: 'List any known allergies',
            },
            {
              key: 'chronicDiseases',
              label: 'Chronic Diseases',
              type: 'textarea',
              required: false,
              placeholder: 'List any chronic conditions',
            },
            {
              key: 'emergencyContactName',
              label: 'Emergency Contact Name',
              type: 'text',
              required: true,
              placeholder: 'Full name',
            },
            {
              key: 'emergencyContactPhone',
              label: 'Emergency Contact Phone',
              type: 'tel',
              required: true,
              placeholder: '+1 (555) 000-0000',
            },
          ],
        };
      case 'DOCTOR':
        return {
          id: 'role',
          label: 'Professional Info',
          icon: 'âš•ï¸',
          fields: [
            {
              key: 'specialization',
              label: 'Specialization',
              type: 'text',
              required: true,
              placeholder: 'e.g. Cardiology',
            },
            {
              key: 'licenseNumber',
              label: 'License Number',
              type: 'text',
              required: true,
              placeholder: 'Medical license #',
            },
            {
              key: 'yearsOfExperience',
              label: 'Years of Experience',
              type: 'number',
              required: true,
              placeholder: '5',
            },
            {
              key: 'consultationFee',
              label: 'Consultation Fee ($)',
              type: 'number',
              required: true,
              placeholder: '100',
            },
            {
              key: 'clinicAddress',
              label: 'Clinic Address',
              type: 'text',
              required: true,
              placeholder: 'Enter your clinic address',
            },
            {
              key: 'biography',
              label: 'Biography',
              type: 'textarea',
              required: false,
              placeholder: 'Tell patients about yourself',
            },
            {
              key: 'availabilitySchedule',
              label: 'Availability Schedule',
              type: 'availability',
              required: true,
              placeholder: 'Choose working days and hours',
            },
          ],
        };
      case 'HOSPITAL':
      case 'MANAGER':
        return {
          id: 'role',
          label: 'Hospital Info',
          icon: 'ðŸ¢',
          fields: [
            {
              key: 'name',
              label: 'Hospital Name',
              type: 'text',
              required: true,
              placeholder: 'Hospital name',
            },
            {
              key: 'registrationNumber',
              label: 'Registration Number',
              type: 'text',
              required: true,
              placeholder: 'Registration #',
            },
            {
              key: 'address',
              label: 'Hospital Address',
              type: 'text',
              required: false,
              placeholder: 'Full address',
            },
            {
              key: 'hospitalType',
              label: 'Hospital Type',
              type: 'select',
              required: true,
              options: [
                { value: 'PUBLIC', label: 'Public' },
                { value: 'PRIVATE', label: 'Private' },
                { value: 'CLINIC', label: 'Clinic' },
              ],
            },
          ],
        };
      case 'LABO':
        return {
          id: 'role',
          label: 'Laboratory Info',
          icon: 'ðŸ”¬',
          fields: [
            {
              key: 'labName',
              label: 'Laboratory Name',
              type: 'text',
              required: true,
              placeholder: 'Lab name',
            },
            {
              key: 'registrationNumber',
              label: 'Registration Number',
              type: 'text',
              required: true,
              placeholder: 'Registration #',
            },
            {
              key: 'address',
              label: 'Laboratory Address',
              type: 'text',
              required: true,
              placeholder: 'Full address',
            },
            {
              key: 'supportedTests',
              label: 'Supported Tests',
              type: 'text',
              required: true,
              placeholder: 'Select supported tests',
            },
            {
              key: 'accreditation',
              label: 'Accreditation',
              type: 'text',
              required: true,
              placeholder: 'Accreditation details',
            },
            {
              key: 'openingHours',
              label: 'Opening Hours',
              type: 'text',
              required: true,
              placeholder: 'e.g. Mon-Fri 8AM-6PM',
            },
          ],
        };
      case 'INSURANCE':
        return {
          id: 'role',
          label: 'Company Info',
          icon: 'ðŸ›¡ï¸',
          fields: [
            {
              key: 'companyName',
              label: 'Company Name',
              type: 'text',
              required: true,
              placeholder: 'Insurance company name',
            },
            {
              key: 'registrationNumber',
              label: 'Registration Number',
              type: 'text',
              required: true,
              placeholder: 'Registration #',
            },
            {
              key: 'coverageTypes',
              label: 'Coverage Types',
              type: 'text',
              required: true,
              placeholder: 'e.g. Health, Life, Dental',
            },
            {
              key: 'address',
              label: 'Address',
              type: 'text',
              required: false,
              placeholder: 'Company Address',
            },
          ],
        };
      case 'PHARMACIST':
        return {
          id: 'role',
          label: 'Pharmacist Info',
          icon: '💊',
          fields: [
            {
              key: 'licenseNumber',
              label: 'License Number',
              type: 'text',
              required: true,
            },
            {
              key: 'pharmacyName',
              label: 'Pharmacy Name',
              type: 'text',
              required: false,
            },
            {
              key: 'region',
              label: 'Region',
              type: 'text',
              required: true,
              placeholder: 'Tunis, Sfax...'
            }
          ],
        };

      case 'DELIVERY_AGENT':
  return {
    id: 'role',
    label: 'Delivery Info',
    icon: '🚚',
    fields: [
      {
        key: 'deliveryName',
        label: 'Full Name',
        type: 'text',
        required: true,
      },
      {
        key: 'vehicleType',
        label: 'Vehicle Type',
        type: 'select',
        required: true,
        options: [
          { value: 'BIKE', label: 'Bike' },
          { value: 'CAR', label: 'Car' },
          { value: 'SCOOTER', label: 'Scooter' },
        ],
      }
    ],
  };

  case 'CENTRAL_PHARMACY':
  return {
    id: 'role',
    label: 'Central Pharmacy Info',
    icon: '🏥',
    fields: []
  };

  

      default:
        return {
          id: 'role',
          label: 'Additional Info',
          icon: 'ðŸ“‹',
          fields: [
            {
              key: 'bio',
              label: 'About You',
              type: 'textarea',
              required: false,
              placeholder: 'Tell us about yourself',
            },
          ],
        };
    }
  }

  /** Save wizard draft to localStorage */
  saveDraft(data: any): void {
    localStorage.setItem(this.wizardDraftKey, JSON.stringify(data));
  }

  /** Load wizard draft from localStorage */
  loadDraft(): any {
    const raw = localStorage.getItem(this.wizardDraftKey);
    return raw ? JSON.parse(raw) : null;
  }

  /** Clear wizard draft */
  clearDraft(): void {
    localStorage.removeItem(this.wizardDraftKey);
  }

  /** Find the index of the first step that has missing required fields */
  getFirstMissingStepIndex(role: string, data: any): number {
    const steps = this.getStepsForRole(role);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.id === 'confirm') continue;

      const hasMissing = step.fields
        .filter((f) => f.required)
        .some((f) => {
          const val = data[f.key];
          return val === undefined || val === null || val === '';
        });

      if (hasMissing) return i;
    }
    return steps.length - 1; // Default to confirmation if everything else is filled
  }

  /** Dismiss banner for a specific duration in minutes */
  dismissBanner(minutes: number): void {
    const now = Date.now();
    localStorage.setItem(this.bannerDismissedAtKey, now.toString());
    localStorage.setItem(this.bannerDismissDurationKey, minutes.toString());
    this.showBannerSubject.next(false);
  }

  /** Check if banner should be shown based on stored dismissal */
  getDismissalRemainingTime(): number {
    const dismissedAt = localStorage.getItem(this.bannerDismissedAtKey);
    const durationMins = localStorage.getItem(this.bannerDismissDurationKey);

    if (!dismissedAt || !durationMins) return 0;

    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    const durationMs = parseInt(durationMins, 10) * 60 * 1000;

    return Math.max(0, durationMs - elapsed);
  }

  /** Refresh the dismissal state */
  checkBannerStatus(): void {
    const remaining = this.getDismissalRemainingTime();
    this.showBannerSubject.next(remaining <= 0);
  }
}
