import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { LAB_SERVICE_TYPES } from '../../../shared/constants/lab-service-types';
import {
  animate,
  query,
  style,
  transition,
  trigger,
  group,
} from '@angular/animations';

type UserRole = 'PATIENT' | 'DOCTOR' | 'LABO' | 'HOSPITAL' | 'INSURANCE' | 'PHARMACIST' | 'DELIVERY_AGENT' | 'CENTRAL_PHARMACY' ;

@Component({
  selector: 'app-setup-account',
  templateUrl: './setup-account.component.html',
  styleUrls: ['./setup-account.component.css'],
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
                style({ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }),
              ),
            ],
            { optional: true },
          ),
        ]),
      ]),
    ]),
  ],
})
export class SetupAccountComponent implements OnInit {
  selectedRole: UserRole | null = null;
  currentStep: number = 1;
  pendingRole: UserRole | null = null;
  isLoading = false;
  errorMessage = '';
  submitted = false;
  progressPercent = 0;

  setupData: any = {
    role: '',
    phoneNumber: '',
    firstName: '',
    lastName: '',
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
    hospitalType: '',
    companyName: '',
    coverageTypes: '',
    pharmacyName: '',
    deliveryName: '',
    vehicleType: '',
  region: '',
  };

  readonly roles: any[] = [
    {
      value: 'PATIENT',
      label: 'Patient',
      description:
        'Manage your health records, track treatments, and connect with doctors.',
      icon: 'user',
    },
    {
      value: 'DOCTOR',
      label: 'Doctor',
      description:
        'Provide care, manage appointments, and access patient medical history.',
      icon: 'stethoscope',
    },
    {
      value: 'LABO',
      label: 'Laboratory',
      description:
        'Process tests, manage medical samples, and deliver digital results.',
      icon: 'beaker',
    },
    {
      value: 'HOSPITAL',
      label: 'Hospital',
      description:
        'Coordinate facility operations, manage beds, and oversee departments.',
      icon: 'hospital',
    },
    {
      value: 'INSURANCE',
      label: 'Insurance',
      description:
        'Handle coverage plans, process medical claims, and manage providers.',
      icon: 'shield',
    },
    {
      value: 'PHARMACIST',
      label: 'Pharmacist',
      description:
        'Manage medications, dispense prescriptions, and support patient treatment.',
      icon: 'pill',
    },
    {
      value: 'DELIVERY_AGENT',
      label: 'Delivery Agent',
      description:
        'Deliver medical products, prescriptions, and ensure timely logistics.',
      icon: 'truck',
    },
    {
      value: 'CENTRAL_PHARMACY',
      label: 'Central Pharmacy',
      description: 'Manage national medicine supply and distribution.',
      icon: 'warehouse',
    },
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
  readonly vehicleTypeOptions = [
    { label: 'Bike', value: 'BIKE' },
    { label: 'Car', value: 'CAR' },
    { label: 'Scooter', value: 'SCOOTER' },
  ];
  readonly labSupportedTestOptions = LAB_SERVICE_TYPES;
  regions: string[] = [
    'TUNIS',
    'SOUSSE',
    'SFAX',
    'GAFSA',
    'KEF',
    'MEDENINE',
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const userInfo = this.authService.getStoredUserInfo();
    if (userInfo) {
      // Pre-fill names from Google if available
      this.setupData.firstName = userInfo.firstName || '';
      this.setupData.lastName = userInfo.lastName || '';
    }
    this.syncProgress();
  }

  selectRole(role: UserRole): void {
    this.pendingRole = role;
    this.syncProgress();
  }

  confirmRole(): void {
    if (this.pendingRole) {
      this.selectedRole = this.pendingRole;
      this.setupData.role = this.selectedRole;
      this.currentStep = 2;
      this.syncProgress();
    }
  }

  prevStep(): void {
    if (this.currentStep === 2) {
      this.selectedRole = null;
      this.currentStep = 1;
    }
    this.syncProgress();
  }

  isFieldInvalid(form: NgForm, fieldName: string): boolean {
    const control = form.controls[fieldName];
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  getFieldError(form: NgForm, fieldName: string, label: string): string {
    const control = form.controls[fieldName];
    if (!control?.errors) return '';

    if (control.errors['required']) return `${label} is required.`;
    if (control.errors['pattern']) return `Invalid ${label} format.`;
    if (control.errors['min'])
      return `${label} must be at least ${control.errors['min'].min}.`;

    return `Invalid ${label}.`;
  }

  private syncProgress(): void {
    if (this.currentStep === 1) {
      this.progressPercent = 33;
    } else if (this.currentStep === 2) {
      this.progressPercent = 66;
    } else {
      this.progressPercent = 100;
    }
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    if (form.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Create a cleaned request object to match backend expectations
    const request = this.prepareRequestData();

    this.authService.setupGoogle(request).subscribe({
      next: (res) => {
        this.isLoading = false;
        // Success! Finalize user info in service
        if (res.user) {
          this.authService.setUserInfo(res.user);
        }

        // Redirect based on role
        const role = this.selectedRole?.toUpperCase();
        if (role === 'DOCTOR') {
          this.router.navigate(['/doctor-dashboard']);
        } else if (role === 'HOSPITAL') {
          this.router.navigate(['/manager-dashboard']);
        } else if (role === 'LABO') {
          this.router.navigate(['/lab/dashboard']);
        } else if (role === 'INSURANCE') {
          this.router.navigate(['/insurance-dashboard']);
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
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to complete setup. Please try again.',
        );
        console.error('Setup failed', err);
      },
    });
  }

  private prepareRequestData(): any {
    const role = this.selectedRole;
    const data = { ...this.setupData };

    // Common sanitization: remove empty strings for non-string fields
    if (data.dateOfBirth === '') data.dateOfBirth = null;
    if (data.height === '') data.height = null;
    if (data.weight === '') data.weight = null;

    // Specific field: coverageTypes must be an array for Insurance
    if (role === 'INSURANCE' && typeof data.coverageTypes === 'string') {
      data.coverageTypes = data.coverageTypes
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
    } else if (role !== 'INSURANCE') {
      // For non-insurance roles, send an empty array or null instead of an empty string
      data.coverageTypes = [];
    }

    // Role-based filtering to only send necessary fields
    const basePayload: any = {
      role: data.role,
      phoneNumber: data.phoneNumber,
    };

    switch (role) {
      case 'PATIENT':
        return {
          ...basePayload,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodType: data.bloodType,
          height: data.height,
          weight: data.weight,
        };
      case 'DOCTOR':
        return {
          ...basePayload,
          firstName: data.firstName,
          lastName: data.lastName,
          specialization: data.specialization,
          licenseNumber: data.licenseNumber,
        };
      case 'LABO':
        return {
          ...basePayload,
          labName: data.labName,
          registrationNumber: data.registrationNumber,
          address: data.address,
          supportedTests: data.supportedTests,
        };
      case 'HOSPITAL':
        return {
          ...basePayload,
          name: data.name,
          hospitalType: data.hospitalType,
          registrationNumber: data.registrationNumber,
        };
      case 'INSURANCE':
        return {
          ...basePayload,
          companyName: data.companyName,
          registrationNumber: data.registrationNumber,
          coverageTypes: data.coverageTypes,
        };
      case 'PHARMACIST':
        return {
          ...basePayload,
          pharmacyName: data.pharmacyName,
          licenseNumber: data.licenseNumber,
          region: data.region,
        };
      case 'DELIVERY_AGENT':
        return {
          ...basePayload,
          deliveryName: data.deliveryName,
          vehicleType: data.vehicleType,
        };
      case 'CENTRAL_PHARMACY':
        return {
          ...basePayload,
        };
      default:
        return data; // Fallback
    }
  }

}
