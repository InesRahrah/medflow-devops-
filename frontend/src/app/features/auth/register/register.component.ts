import { Component, EventEmitter, Output } from '@angular/core';
import {
  animate,
  query,
  style,
  transition,
  trigger,
  group,
} from '@angular/animations';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LAB_SERVICE_TYPES } from '../../../shared/constants/lab-service-types';

type UserRole = 'PATIENT' | 'DOCTOR' | 'LABO' | 'HOSPITAL' | 'INSURANCE' | 'PHARMACIST' | 'DELIVERY_AGENT' | 'CENTRAL_PHARMACY';

interface RegisterData {
  role: UserRole;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  firstname: string;
  lastname: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  specialization: string;
  licenseNumber: string;
  labName: string;
  registrationNumber: string;
  address: string;
  supportedTests: string;
  name: string;
  type: string;
  companyName: string;
  coverageTypes: string;
  pharmacyName: string;
  deliveryName: string;
  vehicleType: string;
  region: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  animations: [
    trigger('roleSwitch', [
      transition('* <=> *', [
        query(
          ':enter',
          [
            style({
              opacity: 0,
              transform: 'scale(0.97)',
              filter: 'blur(8px)',
            }),
          ],
          { optional: true },
        ),
        group([
          query(
            ':leave',
            [
              animate(
                '350ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                style({
                  opacity: 0,
                  transform: 'scale(1.03)',
                  filter: 'blur(4px)',
                }),
              ),
            ],
            { optional: true },
          ),
          query(
            ':enter',
            [
              animate(
                '450ms 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
                style({
                  opacity: 1,
                  transform: 'scale(1)',
                  filter: 'blur(0)',
                }),
              ),
            ],
            { optional: true },
          ),
        ]),
      ]),
    ]),
  ],
})
export class RegisterComponent {
  @Output() toggleMode = new EventEmitter<void>();

  selectedRole: UserRole | null = null;
  currentStep: number = 1;
  pendingRole: UserRole | null = null;

  registerData: RegisterData = {
    role: 'PATIENT',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    firstname: '',
    lastname: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    specialization: '',
    licenseNumber: '',
    labName: '',
    registrationNumber: '',
    address: '',
    supportedTests: '',
    name: '',
    type: '',
    companyName: '',
    coverageTypes: '',
    pharmacyName: '',
    deliveryName: '',
    vehicleType: '',
    region: ''
  };

  readonly roles: {
    value: UserRole;
    label: string;
    caption: string;
    badge: string;
  }[] = [
    {
      value: 'PATIENT',
      label: 'Patient',
      caption: 'Personal health account',
      badge: 'P',
    },
    {
      value: 'DOCTOR',
      label: 'Doctor',
      caption: 'Clinical practitioner access',
      badge: 'D',
    },
    {
      value: 'LABO',
      label: 'Labo',
      caption: 'Laboratory services portal',
      badge: 'L',
    },
    {
      value: 'HOSPITAL',
      label: 'Hospital',
      caption: 'Hospital operations account',
      badge: 'H',
    },
    {
      value: 'INSURANCE',
      label: 'Insurance',
      caption: 'Coverage and claims management',
      badge: 'I',
    },
    {
  value: 'PHARMACIST',
  label: 'Pharmacist',
  caption: 'Pharmacy management',
  badge: 'PH',
},
{
  value: 'DELIVERY_AGENT',
  label: 'Delivery Agent',
  caption: 'Delivery operations',
  badge: 'DA',
},
{
  value: 'CENTRAL_PHARMACY',
  label: 'Central Pharmacy',
  caption: 'National medicine supply authority',
  badge: 'PCT',
}


  ];

  readonly genderOptions = ['MALE', 'FEMALE'];
  readonly bloodTypeOptions = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
  ];
  readonly hospitalTypeOptions = [
    { label: 'Public', value: 'PUBLIC' },
    { label: 'Private', value: 'PRIVATE' },
    { label: 'Clinic', value: 'CLINIC' },
  ];
  readonly labSupportedTestOptions = LAB_SERVICE_TYPES;

  regions: string[] = [
  'TUNIS',
  'SOUSSE',
  'SFAX',
  'GAFSA',
  'KEF',
  'MEDENINE'
];

  errorMessage = '';
  fieldErrors: Record<string, string> = {};
  isLoading = false;
  submitted = false;
  progressPercent = 0;
  showPassword = false;
  showConfirmPassword = false;
  showDoctorFaceEnrollment = false;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    this.syncProgress('init');
  }

  private syncProgress(source: string): void {
    if (!this.pendingRole) {
      this.progressPercent = 0;
    } else if (this.currentStep === 1) {
      this.progressPercent = 100 / 3;
    } else if (this.currentStep === 2) {
      this.progressPercent = (2 * 100) / 3;
    } else {
      this.progressPercent = 100;
    }

    console.log('[RegisterWizard][Progress]', {
      source,
      currentStep: this.currentStep,
      pendingRole: this.pendingRole,
      progressPercent: this.progressPercent,
    });
  }

  selectRole(role: UserRole): void {
    this.pendingRole = role;
    this.errorMessage = '';
    this.syncProgress('selectRole');
  }

  confirmRole(): void {
    if (this.pendingRole) {
      this.selectedRole = this.pendingRole;
      this.registerData.role = this.selectedRole;
      this.errorMessage = '';
      this.nextStep();
      this.syncProgress('confirmRole');
    }
  }

  goBackToRolePicker(): void {
    this.selectedRole = null;
    this.pendingRole = null;
    this.errorMessage = '';
    this.submitted = false;
    this.isLoading = false;
    this.currentStep = 1;
    this.syncProgress('goBackToRolePicker');
  }

  nextStep(form?: NgForm): void {
    if (form) {
      this.submitted = true;
      if (form.invalid || !this.passwordsMatch()) {
        Object.values(form.controls).forEach((control) => {
          control.markAsTouched();
        });
        return;
      }
    }
    this.submitted = false;
    if (this.currentStep < 3) {
      this.currentStep++;
    }
    this.syncProgress('nextStep');
  }

  prevStep(): void {
    this.submitted = false;
    this.errorMessage = '';
    if (this.currentStep > 1) {
      this.currentStep--;
    }
    this.syncProgress('prevStep');
  }

  isFieldInvalid(form: NgForm, fieldName: string): boolean {
    if (this.fieldErrors && this.fieldErrors[fieldName]) {
      return true;
    }
    const control = form.controls[fieldName];
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  getFieldError(form: NgForm, fieldName: string, label: string): string {
    if (!form || !form.controls) return '';

    // Check for backend field errors first
    if (this.fieldErrors && this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    const control = form.controls[fieldName];
    if (!control?.errors) {
      return '';
    }
    if (control.errors['required']) {
      return `${label} is required.`;
    }
    if (control.errors['email']) {
      return 'Please enter a valid email address.';
    }
    if (control.errors['minlength']) {
      const requiredLength = control.errors['minlength'].requiredLength;
      return `${label} must be at least ${requiredLength} characters.`;
    }
    if (control.errors['pattern']) {
      if (fieldName === 'phoneNumber') {
        return 'Enter a valid phone number.';
      }
      return `${label} format is invalid.`;
    }
    if (control.errors['min']) {
      return `${label} must be at least ${control.errors['min'].min}.`;
    }
    if (fieldName === 'confirmPassword' && !this.passwordsMatch()) {
      return 'Passwords do not match.';
    }
    return `Invalid ${label.toLowerCase()}.`;
  }

  passwordsMatch(): boolean {
    return this.registerData.password === this.registerData.confirmPassword;
  }

  onRegister(form: NgForm): void {
    if (!this.selectedRole) {
      this.errorMessage = 'Please choose a role to continue.';
      return;
    }

    this.submitted = true;
    if (form.invalid || !this.passwordsMatch()) {
      Object.values(form.controls).forEach((control) => {
        control.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.fieldErrors = {};

    this.authService.register(this.buildRegisterPayload()).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.submitted = false;
        const role = this.authService.getUserRole().toUpperCase();

        if (role === 'DOCTOR') {
          this.showDoctorFaceEnrollment = true;
          this.errorMessage = '';
        } else if (role === 'HOSPITAL' || role === 'MANAGER') {
          this.router.navigate(['/manager-dashboard']);
        } else if (role === 'LABO') {
          this.router.navigate(['/lab/dashboard']);
        } else if (role === 'PHARMACIST') {
          this.router.navigate(['/pharmacist-dashboard']);
        } else if (role === 'DELIVERY_AGENT') {
          this.router.navigate(['/delivery-dashboard']);
        } else if (role === 'CENTRAL_PHARMACY') {
          this.router.navigate(['/central-pharmacy-dashboard']);
        } else if (role === 'ADMIN') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/patient-dashboard']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.fieldErrors = this.authService.getValidationErrors(err);

        if (Object.keys(this.fieldErrors).length > 0) {
          this.errorMessage = 'Please fix the errors highlighted below.';
        } else if (err?.status === 409) {
          this.errorMessage =
            err?.error?.message ||
            'An account with this email already exists. Please sign in or use another email.';
        } else {
          const backendDetail = this.extractBackendErrorMessage(err);
          this.errorMessage =
            backendDetail ||
            'Registration failed. Please check your data and try again.';
        }
        console.error('Registration failed', err);
      },
    });
  }

  onDoctorFaceRegistered(): void {
    this.showDoctorFaceEnrollment = false;
    this.router.navigate(['/doctor-dashboard']);
  }

  onDoctorFaceEnrollClosed(): void {
    this.errorMessage =
      'Face enrollment is required for doctor accounts before continuing.';
  }

  private extractBackendErrorMessage(err: any): string {
    if (!err) {
      return '';
    }

    const errorPayload = err?.error;

    if (typeof errorPayload === 'string' && errorPayload.trim()) {
      return errorPayload;
    }

    const candidates = [
      errorPayload?.message,
      errorPayload?.error,
      errorPayload?.details,
      errorPayload?.title,
      err?.message,
    ];

    const firstString = candidates.find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );

    if (firstString) {
      return firstString;
    }

    if (Array.isArray(errorPayload?.errors) && errorPayload.errors.length > 0) {
      const firstError = errorPayload.errors[0];
      if (typeof firstError === 'string' && firstError.trim()) {
        return firstError;
      }
      if (firstError?.defaultMessage) {
        return String(firstError.defaultMessage);
      }
      if (firstError?.message) {
        return String(firstError.message);
      }
    }

    return '';
  }

  private normalizedText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private toCoverageTypeList(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.normalizedText(item))
        .filter((item) => item.length > 0);
    }

    const textValue = this.normalizedText(value);
    if (!textValue) {
      return [];
    }

    return textValue
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private buildRegisterPayload(): Record<string, unknown> {
    const role = this.registerData.role;
    const email = this.normalizedText(this.registerData.email).toLowerCase();
    const phoneNumber = this.normalizedText(this.registerData.phoneNumber);
    const firstName = this.normalizedText(this.registerData.firstname);
    const lastName = this.normalizedText(this.registerData.lastname);

    const basePayload: Record<string, unknown> = {
      role,
      email,
      password: this.registerData.password,
      phoneNumber,
      phone: phoneNumber,
    };

    switch (role) {
      case 'PATIENT':
        return {
          ...basePayload,
          firstName,
          firstname: firstName,
          lastName,
          lastname: lastName,
          dateOfBirth: this.registerData.dateOfBirth,
          birthDate: this.registerData.dateOfBirth,
          gender: this.registerData.gender,
          bloodType: this.registerData.bloodType,
        };
      case 'DOCTOR':
        return {
          ...basePayload,
          firstName,
          firstname: firstName,
          lastName,
          lastname: lastName,
          specialization: this.normalizedText(this.registerData.specialization),
          speciality: this.normalizedText(this.registerData.specialization),
          licenseNumber: this.normalizedText(this.registerData.licenseNumber),
          licenceNumber: this.normalizedText(this.registerData.licenseNumber),
        };
      case 'LABO':
        return {
          ...basePayload,
          labName: this.registerData.labName.trim(),
          registrationNumber: this.registerData.registrationNumber.trim(),
          address: this.registerData.address.trim(),
          supportedTests: this.registerData.supportedTests.trim(),
        };
      case 'HOSPITAL':
        return {
          ...basePayload,
          name: this.registerData.name.trim(),
          registrationNumber: this.registerData.registrationNumber.trim(),
          hospitalType: this.registerData.type.trim(),
          phone: this.registerData.phoneNumber.trim(),
        };
      case 'INSURANCE': {
        const coverageTypes = this.toCoverageTypeList(
          this.registerData.coverageTypes,
        );
        return {
          ...basePayload,
          companyName: this.registerData.companyName.trim(),
          registrationNumber: this.registerData.registrationNumber.trim(),
          coverageTypes: this.registerData.coverageTypes.trim(),
          phone: this.registerData.phoneNumber.trim(),

        };
      }
    // ✅ FIX PHARMACIST (IMPORTANT)
    case 'PHARMACIST':
      return {
        role: 'PHARMACIST',
        email: this.registerData.email.trim(),
        password: this.registerData.password,
        phoneNumber: this.registerData.phoneNumber.trim(),
        pharmacyName: this.registerData.pharmacyName.trim(),
        licenseNumber: this.registerData.licenseNumber.trim(),
        region: this.registerData.region,      };

      case 'DELIVERY_AGENT':
        return {
          role: 'DELIVERY_AGENT',
          email: this.registerData.email.trim(),
          password: this.registerData.password,

    phoneNumber: this.registerData.phoneNumber.trim(),
    deliveryName: this.registerData.deliveryName.trim(),
    vehicleType: this.registerData.vehicleType
  };
      case 'CENTRAL_PHARMACY':
  return {
    role: 'CENTRAL_PHARMACY',
    email: this.registerData.email.trim(),
    password: this.registerData.password,
    phoneNumber: this.registerData.phoneNumber.trim(),
  };
      default:
        return basePayload;
    }
  }
}
