import { Component, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HospitalStructureService } from '../../core/services/hospital-structure.service';
import { HospitalStaffService } from '../../core/services/hospital-staff.service';
import { Department } from '../hospital-structure/models/hospital-structure.model';
import {
  AdminCreateStaffRequest,
  StaffMember,
} from './hospital-staff.model';

@Component({
  selector: 'app-hospital-staff',
  templateUrl: './hospital-staff.component.html',
  styleUrl: './hospital-staff.component.css'
})
export class HospitalStaffComponent implements OnInit {

  staffMembers: StaffMember[] = [];
  departments: Department[] = [];

  isLoading = false;
  isCreating = false;
  showAddModal = false;
  isDeletingId: string | null = null;
  showDeleteConfirmModal = false;
  pendingDeleteStaff: StaffMember | null = null;

  errorMessage = '';
  modalErrorMessage = '';
  createFormSubmitted = false;
  createFieldErrors: Record<string, string> = {};
  deleteConfirmMessage = '';
  successMessage = '';
  showSuccessToast = false;
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  searchTerm = '';
  staffFilter = 'ALL';
  sortBy = 'NAME_ASC';

  formData: {
    firstName: string;
    lastName: string;
    email: string;
    role: 'DOCTOR' | 'NURSE' | 'STAFF_ADMIN';
    departmentId: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  } = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'DOCTOR',
    departmentId: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
  };

  readonly roleOptions: Array<{ label: string; value: 'DOCTOR' | 'NURSE' | 'STAFF_ADMIN' }> = [
    { label: 'Doctor', value: 'DOCTOR' },
    { label: 'Nurse', value: 'NURSE' },
    { label: 'Staff Admin', value: 'STAFF_ADMIN' },
  ];

  readonly employmentTypeOptions: Array<{ label: string; value: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' }> = [
    { label: 'Full Time', value: 'FULL_TIME' },
    { label: 'Part Time', value: 'PART_TIME' },
    { label: 'Contract', value: 'CONTRACT' },
  ];

  readonly statusOptions: Array<{ label: string; value: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }> = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'Suspended', value: 'SUSPENDED' },
  ];

  readonly staffFilterOptions: Array<{ label: string; value: string }> = [
    { label: 'All Roles', value: 'ALL' },
    { label: 'Doctor', value: 'DOCTOR' },
    { label: 'Nurse', value: 'NURSE' },
    { label: 'Staff Admin', value: 'STAFF_ADMIN' },
  ];

  readonly staffSortOptions: Array<{ label: string; value: string }> = [
    { label: 'Name (A-Z)', value: 'NAME_ASC' },
    { label: 'Name (Z-A)', value: 'NAME_DESC' },
    { label: 'Role', value: 'ROLE' },
    { label: 'Department', value: 'DEPARTMENT' },
    { label: 'Status', value: 'STATUS' },
  ];

  get departmentOptions(): Array<{ label: string; value: string }> {
    return this.departments.map(dept => ({
      label: dept.name,
      value: dept.id,
    }));
  }

  get displayedStaff(): StaffMember[] {
    const query = this.searchTerm.trim().toLowerCase();

    const filtered = this.staffMembers.filter((staff) => {
      const matchesRole = this.staffFilter === 'ALL' || staff.role === this.staffFilter;

      if (!matchesRole) {
        return false;
      }

      if (!query) {
        return true;
      }

      const fullName = `${staff.firstName} ${staff.lastName}`.toLowerCase();
      const departmentName = this.getDepartmentName(staff.departmentId).toLowerCase();
      const employmentType = staff.employmentType.replace('_', ' ').toLowerCase();
      const role = this.getRoleLabel(staff.role).toLowerCase();
      const status = staff.status.toLowerCase();

      return (
        fullName.includes(query) ||
        departmentName.includes(query) ||
        employmentType.includes(query) ||
        role.includes(query) ||
        status.includes(query)
      );
    });

    return filtered.sort((first, second) => {
      const firstName = `${first.firstName} ${first.lastName}`.trim().toLowerCase();
      const secondName = `${second.firstName} ${second.lastName}`.trim().toLowerCase();
      const firstDepartment = this.getDepartmentName(first.departmentId).toLowerCase();
      const secondDepartment = this.getDepartmentName(second.departmentId).toLowerCase();

      switch (this.sortBy) {
        case 'NAME_DESC':
          return secondName.localeCompare(firstName);
        case 'ROLE':
          return first.role.localeCompare(second.role) || firstName.localeCompare(secondName);
        case 'DEPARTMENT':
          return firstDepartment.localeCompare(secondDepartment) || firstName.localeCompare(secondName);
        case 'STATUS':
          return first.status.localeCompare(second.status) || firstName.localeCompare(secondName);
        case 'NAME_ASC':
        default:
          return firstName.localeCompare(secondName);
      }
    });
  }

  get medicalStaff(): StaffMember[] {
    return this.displayedStaff.filter(s => s.role === 'DOCTOR' || s.role === 'NURSE');
  }

  get adminStaff(): StaffMember[] {
    return this.displayedStaff.filter(s => s.role === 'STAFF_ADMIN');
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private hospitalStaffService: HospitalStaffService,
    private hospitalStructureService: HospitalStructureService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('create') === 'staff') {
        this.openAddModal();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      staff: this.hospitalStaffService.getMyStaff(),
      departments: this.hospitalStructureService.getMyDepartments(),
    }).subscribe({
      next: ({ staff, departments }) => {
        this.staffMembers = staff ?? [];
        this.departments = departments ?? [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.extractDetailedErrorMessage(
          err,
          'Unable to load staff members or departments. Please try again.',
        );
      },
    });
  }

  openAddModal(): void {
    this.formData = {
      firstName: '',
      lastName: '',
      email: '',
      role: 'DOCTOR',
      departmentId: this.departments[0]?.id || '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
    };
    this.modalErrorMessage = '';
    this.createFormSubmitted = false;
    this.createFieldErrors = {};
    this.showAddModal = true;
  }

  closeAddModal(): void {
    if (this.isCreating) {
      return;
    }
    this.showAddModal = false;
    this.createFormSubmitted = false;
    this.createFieldErrors = {};
  }

  createStaff(): void {
    this.createFormSubmitted = true;
    this.createFieldErrors = {};
    this.modalErrorMessage = '';

    const validationErrors = this.getCreateFormValidationErrors();
    if (Object.keys(validationErrors).length > 0) {
      this.createFieldErrors = validationErrors;
      return;
    }

    this.isCreating = true;
    this.modalErrorMessage = '';
    this.successMessage = '';

    const payload: AdminCreateStaffRequest = {
      firstName: this.formData.firstName.trim(),
      lastName: this.formData.lastName.trim(),
      email: this.formData.email.trim(),
      role: this.formData.role,
      departmentId: this.formData.departmentId || undefined,
      employmentType: this.formData.employmentType,
      status: this.formData.status,
    };

    this.hospitalStaffService.createStaffByAdmin(payload).subscribe({
      next: (response) => {
        console.log('API response:', response);
        this.isCreating = false;
        this.showAddModal = false;
        const firstName = response.staff.firstName || '';
        const lastName = response.staff.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        this.successMessage = fullName
          ? `Staff member ${fullName} created successfully.`
          : 'Staff member created successfully.';
        this.showSuccessToast = true;
        if (this.toastTimeoutId) {
          clearTimeout(this.toastTimeoutId);
        }
        this.toastTimeoutId = setTimeout(() => {
          this.showSuccessToast = false;
        }, 3000);
        this.loadData();
      },
      error: (err) => {
        this.isCreating = false;
        if (!this.applyCreateBackendFieldErrors(err)) {
          this.modalErrorMessage = this.extractDetailedErrorMessage(
            err,
            'Failed to create staff member. Please review the details and try again.',
          );
        }
      },
    });
  }

  get isCreateStaffDisabled(): boolean {
    return Object.keys(this.getCreateFormValidationErrors()).length > 0;
  }

  getDepartmentName(departmentId?: string): string {
    if (!departmentId) {
      return 'Unassigned';
    }
    return this.departments.find((d) => d.id === departmentId)?.name || 'Unknown Department';
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'DOCTOR':
        return 'Doctor';
      case 'NURSE':
        return 'Nurse';
      case 'STAFF_ADMIN':
        return 'Staff Admin';
      default:
        return role;
    }
  }

  private extractDetailedErrorMessage(err: any, fallbackMessage: string): string {
    if (!err) {
      return fallbackMessage;
    }

    const payload = err.error;

    if (typeof payload === 'string' && payload.trim()) {
      return this.cleanErrorText(payload);
    }

    const backendErrors = payload?.errors;
    if (backendErrors && typeof backendErrors === 'object') {
      if (Array.isArray(backendErrors)) {
        const arrayMessages = backendErrors
          .map((entry: any) => this.extractBackendFieldError(entry))
          .filter((value: string) => !!value);
        if (arrayMessages.length > 0) {
          return arrayMessages.join(' ');
        }
      } else {
        const fieldMessages = Object.entries(backendErrors)
          .map(([field, message]) => `${this.prettyFieldName(field)}: ${String(message)}`)
          .filter((value) => !!value);

        if (fieldMessages.length > 0) {
          return fieldMessages.join(' ');
        }
      }
    }

    const candidates = [
      payload?.message,
      payload?.error,
      payload?.details,
      payload?.title,
      err?.message,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return this.cleanErrorText(candidate);
      }
    }

    return fallbackMessage;
  }

  private cleanErrorText(errorMessage: string): string {
    const quoteMatch = errorMessage.match(/"([^"]+)"/);
    if (quoteMatch && quoteMatch[1]) {
      return quoteMatch[1];
    }

    return errorMessage.replace(/^\d+\s+\w+\s+/, '').trim();
  }

  private extractBackendFieldError(entry: any): string {
    if (!entry) {
      return '';
    }

    if (typeof entry === 'string') {
      return this.cleanErrorText(entry);
    }

    const fieldName = entry.field || entry.name || entry.property || entry.key;
    const message = entry.defaultMessage || entry.message || entry.error || entry.reason;

    if (fieldName && message) {
      return `${this.prettyFieldName(String(fieldName))}: ${String(message)}`;
    }

    return message ? String(message) : '';
  }

  private prettyFieldName(field: string): string {
    return String(field || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }

  getInitials(staff: StaffMember): string {
    const first = staff.firstName?.charAt(0) || '';
    const last = staff.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  clearStaffFilters(): void {
    this.searchTerm = '';
    this.staffFilter = 'ALL';
    this.sortBy = 'NAME_ASC';
  }

  openStaffDetail(staffId: string): void {
    this.router.navigate(['/hospital/staff', staffId]);
  }

  openStaffEdit(staffId: string): void {
    this.router.navigate(['/hospital/staff', staffId], { queryParams: { edit: '1' } });
  }

  openDeleteConfirm(staffId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const staff = this.staffMembers.find((s) => s.id === staffId);
    if (!staff) {
      this.errorMessage = 'Staff member not found.';
      return;
    }

    this.pendingDeleteStaff = staff;
    this.deleteConfirmMessage = '';
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirm(): void {
    if (this.isDeletingId) {
      return; // Don't close while deleting
    }
    this.showDeleteConfirmModal = false;
    this.pendingDeleteStaff = null;
    this.deleteConfirmMessage = '';
  }

  confirmDelete(): void {
    if (!this.pendingDeleteStaff) {
      return;
    }

    const staffId = this.pendingDeleteStaff.id;
    this.isDeletingId = staffId;
    this.errorMessage = '';
    this.successMessage = '';

    this.hospitalStaffService.deleteStaff(staffId).subscribe({
      next: () => {
        this.staffMembers = this.staffMembers.filter((s) => s.id !== staffId);
        this.isDeletingId = null;
        this.showDeleteConfirmModal = false;
        this.pendingDeleteStaff = null;
        this.successMessage = 'Staff member deleted successfully.';
        this.showSuccessToast = true;
        if (this.toastTimeoutId) {
          clearTimeout(this.toastTimeoutId);
        }
        this.toastTimeoutId = setTimeout(() => {
          this.showSuccessToast = false;
        }, 3000);
      },
      error: (err) => {
        this.isDeletingId = null;
        this.deleteConfirmMessage = this.extractDetailedErrorMessage(
          err,
          'Failed to delete this staff member. The staff member may already be in use or protected by hospital data rules.',
        );
      },
    });
  }

  private getCreateFormValidationErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    const firstName = this.formData.firstName.trim();
    if (!firstName) {
      errors['firstName'] = 'First name is required.';
      return errors;
    }

    if (firstName.length < 2) {
      errors['firstName'] = 'First name must be at least 2 characters.';
      return errors;
    }

    if (firstName.length > 50) {
      errors['firstName'] = 'First name must be at most 50 characters.';
    }

    const lastName = this.formData.lastName.trim();
    if (!lastName) {
      errors['lastName'] = 'Last name is required.';
      return errors;
    }

    if (lastName.length < 2) {
      errors['lastName'] = 'Last name must be at least 2 characters.';
      return errors;
    }

    if (lastName.length > 50) {
      errors['lastName'] = 'Last name must be at most 50 characters.';
    }

    const email = this.formData.email.trim();
    if (!email) {
      errors['email'] = 'Email is required.';
      return errors;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors['email'] = 'Please enter a valid email address.';
    }

    if (!this.formData.departmentId) {
      errors['departmentId'] = 'Department is required.';
    }

    return errors;
  }

  private applyCreateBackendFieldErrors(err: any): boolean {
    const backendErrors = err?.error?.errors as Record<string, string> | Array<any> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mapped: Record<string, string> = {};
    const supportedFields = ['firstName', 'lastName', 'email', 'departmentId'] as const;

    if (Array.isArray(backendErrors)) {
      backendErrors.forEach((entry: any) => {
        const fieldName = entry?.field || entry?.name || entry?.property || entry?.key;
        const message = entry?.defaultMessage || entry?.message || entry?.error || entry?.reason;

        if (fieldName && message && supportedFields.includes(String(fieldName) as any)) {
          mapped[String(fieldName)] = String(message);
        }
      });
    } else {
      supportedFields.forEach((field) => {
        if (backendErrors[field]) {
          mapped[field] = String(backendErrors[field]);
        }
      });
    }

    this.createFieldErrors = mapped;
    return Object.keys(mapped).length > 0;
  }

  isCreateFieldInvalid(field: string, model: NgModel): boolean {
    if (this.createFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.createFormSubmitted);
  }

  getCreateFieldError(field: string, model: NgModel): string {
    const backendError = this.createFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      if (field === 'firstName') return 'First name is required.';
      if (field === 'lastName') return 'Last name is required.';
      if (field === 'email') return 'Email is required.';
      if (field === 'departmentId') return 'Department is required.';
      return 'This field is required.';
    }

    if (model.errors['email']) {
      return 'Please enter a valid email address.';
    }

    if (model.errors['pattern']) {
      return 'Please enter a valid email address.';
    }

    if (model.errors['minlength']) {
      if (field === 'firstName') return 'First name must be at least 2 characters.';
      if (field === 'lastName') return 'Last name must be at least 2 characters.';
      return 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      if (field === 'firstName') return 'First name must be at most 50 characters.';
      if (field === 'lastName') return 'Last name must be at most 50 characters.';
      return 'Value is too long.';
    }

    return '';
  }

}
