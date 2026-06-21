import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HospitalStaffService } from '../../core/services/hospital-staff.service';
import { HospitalStructureService } from '../../core/services/hospital-structure.service';
import { SharedModule } from '../../shared/shared.module';
import { Department, Room, Floor } from '../hospital-structure/models/hospital-structure.model';
import { StaffDetailResponse, StaffMember, StaffUpdateRequest } from './hospital-staff.model';

@Component({
  selector: 'app-hospital-staff-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './hospital-staff-detail.component.html',
  styleUrls: ['./hospital-staff-detail.component.css'],
})
export class HospitalStaffDetailComponent implements OnInit {
  staffId = '';
  detail: StaffDetailResponse | null = null;
  staff: StaffMember | null = null;

  departments: Department[] = [];
  rooms: Room[] = [];

  get departmentOptions(): Array<{ label: string; value: string }> {
    return this.departments.map(d => ({ label: d.name, value: d.id }));
  }

  selectedRoomIds = new Set<string>();

  floors: Floor[] = [];
  roomSearchQuery = '';
  roomGroupMode: 'NONE' | 'FLOOR' | 'DEPARTMENT' | 'TYPE' | 'STATUS' = 'NONE';

  isLoading = false;
  isSavingProfile = false;
  isSavingAssignments = false;
  isReassigning = false;
  isDeleting = false;
  showEditModal = false;
  showDeleteModal = false;
  assigningTask = false;
  taskSuccess = '';

  // Reassignment Modal State
  showReassignModal = false;
  reassignStep = 1;
  selectedRoomsToReassign = new Set<string>();
  targetStaffMember: StaffMember | null = null;
  reassignError = '';

  errorMessage = '';
  editModalErrorMessage = '';
  editFormSubmitted = false;
  editFieldErrors: Record<string, string> = {};
  successMessage = '';

  formData: StaffUpdateRequest = {
    userId: '',
    email: '',
    firstName: '',
    lastName: '',
    departmentId: undefined,
    role: 'DOCTOR',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
  };

  allStaff: StaffMember[] = [];

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

  readonly groupOptions: Array<{ label: string; value: 'NONE' | 'FLOOR' | 'DEPARTMENT' | 'TYPE' | 'STATUS' }> = [
    { label: 'No Grouping', value: 'NONE' },
    { label: 'Group by Department', value: 'DEPARTMENT' },
    { label: 'Group by Floor', value: 'FLOOR' },
    { label: 'Group by Type', value: 'TYPE' },
    { label: 'Group by Status', value: 'STATUS' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private hospitalStaffService: HospitalStaffService,
    private hospitalStructureService: HospitalStructureService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.errorMessage = 'Staff id is missing.';
        return;
      }
      this.staffId = id;
      this.loadData();
    });

    this.route.queryParamMap.subscribe((qparams) => {
      if (qparams.get('edit') === '1') {
        this.openEditModal();
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { edit: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  loadData(): void {
    if (!this.staffId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    forkJoin({
      detail: this.hospitalStaffService.getStaffDetail(this.staffId),
      allStaff: this.hospitalStaffService.getMyStaff(),
      departments: this.hospitalStructureService.getMyDepartments(),
      rooms: this.hospitalStructureService.getMyRooms(),
      floors: this.hospitalStructureService.getAllFloors(),
    }).subscribe({
      next: ({ detail, allStaff, departments, rooms, floors }) => {
        this.detail = detail;
        this.staff = detail.staff;
        this.allStaff = allStaff ?? [];
        this.departments = departments ?? [];
        this.rooms = rooms ?? [];
        this.floors = floors ?? [];
        this.selectedRoomIds = new Set((detail.assignedRooms ?? []).map((room) => room.roomId));

        this.formData = {
          userId: detail.staff.userId,
          email: detail.staff.email || '',
          firstName: detail.staff.firstName,
          lastName: detail.staff.lastName,
          departmentId: detail.staff.departmentId,
          role: detail.staff.role,
          employmentType: detail.staff.employmentType,
          status: detail.staff.status,
        };

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Unable to load staff details.',
        );
      },
    });
  }

  get maxCapacity(): number {
    if (!this.staff) return 0;
    return this.getMaxCapacity(this.staff.role);
  }

  get assignedRoomCount(): number {
    return this.detail?.assignedRoomCount || 0;
  }

  get capacityPercentage(): number {
    if (this.maxCapacity === 0) return 0;
    return (this.assignedRoomCount / this.maxCapacity) * 100;
  }

  get isOverloaded(): boolean {
    return this.assignedRoomCount >= this.maxCapacity && this.maxCapacity > 0;
  }

  get isNearingCapacity(): boolean {
    return this.capacityPercentage >= 80 && !this.isOverloaded && this.maxCapacity > 0;
  }

  get reassignmentSuggestions(): StaffMember[] {
    if (!this.staff) return [];
    
    return this.allStaff
      .filter(s => s.role === this.staff!.role && s.id !== this.staff!.id && s.status === 'ACTIVE')
      .sort((a, b) => (a.assignedRoomCount || 0) - (b.assignedRoomCount || 0))
      .slice(0, 2);
  }

  getMaxCapacity(role: string): number {
    switch (role?.toUpperCase()) {
      case 'NURSE': return 10;
      case 'DOCTOR': return 7;
      default: return 0;
    }
  }

  get isStaffAdmin(): boolean {
    return this.staff?.role === 'STAFF_ADMIN';
  }

  saveProfile(): void {
    this.editFormSubmitted = true;
    this.editFieldErrors = {};
    this.editModalErrorMessage = '';

    const validationErrors = this.getProfileValidationErrors();
    if (Object.keys(validationErrors).length > 0) {
      this.editFieldErrors = validationErrors;
      return;
    }

    this.isSavingProfile = true;
    this.errorMessage = '';

    this.hospitalStaffService.updateStaff(this.staffId, {
      ...this.formData,
      firstName: this.formData.firstName.trim(),
      lastName: this.formData.lastName.trim(),
      departmentId: this.formData.departmentId || undefined,
    }).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.successMessage = 'Staff profile updated successfully.';
        this.closeEditModal();
        this.loadData();
      },
      error: (err) => {
        this.isSavingProfile = false;
        if (!this.applyEditBackendFieldErrors(err)) {
          this.editModalErrorMessage = this.authService.getFriendlyErrorMessage(
            err,
            'Failed to update staff profile.',
          );
        }
      },
    });
  }

  get isEditProfileDisabled(): boolean {
    return Object.keys(this.getProfileValidationErrors()).length > 0;
  }

  saveAssignments(): void {
    this.isSavingAssignments = true;
    this.errorMessage = '';

    this.hospitalStaffService.assignRooms(this.staffId, {
      roomIds: Array.from(this.selectedRoomIds),
    }).subscribe({
      next: () => {
        this.isSavingAssignments = false;
        this.successMessage = 'Room assignments updated successfully.';
        this.loadData();
      },
      error: (err) => {
        this.isSavingAssignments = false;
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to update assignments.',
        );
      },
    });
  }

  toggleRoom(roomId: string, selected: boolean): void {
    if (selected) {
      this.selectedRoomIds.add(roomId);
      return;
    }
    this.selectedRoomIds.delete(roomId);
  }

  deleteStaff(): void {
    if (!this.staff) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';

    this.hospitalStaffService.deleteStaff(this.staffId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.router.navigate(['/hospital/staff'], { queryParams: { deleted: '1' } });
      },
      error: (err) => {
        this.isDeleting = false;
        this.closeDeleteModal();
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to delete staff member.',
        );
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/hospital/staff']);
  }

  openStaffDetail(staffId: string): void {
    this.router.navigate(['/hospital/staff', staffId]);
  }

  getDepartmentName(departmentId?: string): string {
    if (!departmentId) {
      return 'Unassigned';
    }
    return this.departments.find((dept) => dept.id === departmentId)?.name || 'Unknown Department';
  }

  getInitials(): string {
    if (!this.staff) {
      return 'ST';
    }
    const first = this.staff.firstName?.charAt(0) || '';
    const last = this.staff.lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  openEditModal(): void {
    if (this.detail) {
      this.formData = {
        userId: this.detail.staff.userId,
        email: this.detail.staff.email || '',
        firstName: this.detail.staff.firstName,
        lastName: this.detail.staff.lastName,
        departmentId: this.detail.staff.departmentId,
        role: this.detail.staff.role,
        employmentType: this.detail.staff.employmentType,
        status: this.detail.staff.status,
      };
    }
    this.editModalErrorMessage = '';
    this.editFormSubmitted = false;
    this.editFieldErrors = {};
    this.showEditModal = true;
  }

  closeEditModal(): void {
    if (this.isSavingProfile) {
      return;
    }
    this.showEditModal = false;
    this.editModalErrorMessage = '';
    this.editFormSubmitted = false;
    this.editFieldErrors = {};
  }

  private getProfileValidationErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!this.staffId) {
      this.editModalErrorMessage = 'Staff member id is missing.';
      return errors;
    }

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

    return errors;
  }

  private applyEditBackendFieldErrors(err: any): boolean {
    const backendErrors = err?.error?.errors as Record<string, string> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mapped: Record<string, string> = {};
    const supportedFields = ['firstName', 'lastName', 'departmentId', 'role', 'employmentType', 'status'] as const;
    supportedFields.forEach((field) => {
      if (backendErrors[field]) {
        mapped[field] = backendErrors[field];
      }
    });

    this.editFieldErrors = mapped;
    return Object.keys(mapped).length > 0;
  }

  isEditFieldInvalid(field: string, model: NgModel): boolean {
    if (this.editFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.editFormSubmitted);
  }

  getEditFieldError(field: string, model: NgModel): string {
    const backendError = this.editFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      if (field === 'firstName') return 'First name is required.';
      if (field === 'lastName') return 'Last name is required.';
      return 'This field is required.';
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

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.isDeleting) {
      return;
    }
    this.showDeleteModal = false;
  }

  openAssignTask(): void {
    this.assigningTask = true;
    this.taskSuccess = '';
  }

  onTaskAssigned(): void {
    this.assigningTask = false;
    this.taskSuccess = 'Task assigned successfully!';
    setTimeout(() => this.taskSuccess = '', 4000); // clear toast after 4s
  }


  getFloorName(floorId: string): string {
    const floor = this.floors.find(f => f.id === floorId);
    return floor ? floor.name : 'Unknown Floor';
  }

  resetRoomFilters(): void {
    this.roomSearchQuery = '';
    this.roomGroupMode = 'NONE';
  }

  get groupedRooms(): Array<{ name: string; rooms: Room[] }> {
    let filtered = this.rooms;
    if (this.roomSearchQuery.trim()) {
      const q = this.roomSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => {
        const roomNumber = (r.roomNumber || '').toLowerCase();
        const type = (r.type || '').toLowerCase();
        const status = (r.status || '').toLowerCase();
        const deptName = (r.departmentName || this.getDepartmentName(r.departmentId) || '').toLowerCase();
        const floorName = this.getFloorName(r.floorId).toLowerCase();

        return roomNumber.includes(q) ||
               type.includes(q) ||
               status.includes(q) ||
               deptName.includes(q) ||
               floorName.includes(q);
      });
    }

    if (filtered.length === 0) {
      return [];
    }

    if (this.roomGroupMode === 'NONE') {
      return [{ name: 'All Rooms', rooms: filtered }];
    }

    const groups = new Map<string, Room[]>();
    for (const r of filtered) {
      let groupKey = 'Unknown';
      if (this.roomGroupMode === 'DEPARTMENT') {
        groupKey = r.departmentName || this.getDepartmentName(r.departmentId) || 'Unassigned';
      } else if (this.roomGroupMode === 'FLOOR') {
        groupKey = this.getFloorName(r.floorId);
      } else if (this.roomGroupMode === 'TYPE') {
        groupKey = r.type || 'Standard';
      } else if (this.roomGroupMode === 'STATUS') {
        groupKey = r.status || 'Unknown Status';
      }

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(r);
    }

    return Array.from(groups.entries())
      .map(([name, rooms]) => ({ name, rooms }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // REASSIGNMENT MODAL LOGIC
  openReassignModal(): void {
    this.showReassignModal = true;
    this.reassignStep = 1;
    this.selectedRoomsToReassign.clear();
    this.targetStaffMember = null;
    this.reassignError = '';
  }

  openReassignWithTarget(staff: StaffMember): void {
    this.openReassignModal();
    this.targetStaffMember = staff;
    // We stay on step 1 to let user choose rooms first, but target is now locked in.
  }

  closeReassignModal(): void {
    if (this.isReassigning) return;
    this.showReassignModal = false;
  }

  toggleRoomToMove(roomId: string): void {
    if (this.selectedRoomsToReassign.has(roomId)) {
      this.selectedRoomsToReassign.delete(roomId);
    } else {
      this.selectedRoomsToReassign.add(roomId);
    }
  }

  selectTargetStaff(staff: StaffMember): void {
    this.targetStaffMember = staff;
  }

  nextReassignStep(): void {
    if (this.reassignStep === 1 && this.selectedRoomsToReassign.size === 0) {
      this.reassignError = 'Please select at least one room to move.';
      return;
    }
    if (this.reassignStep === 2 && !this.targetStaffMember) {
      this.reassignError = 'Please select a staff member to receive these rooms.';
      return;
    }
    this.reassignError = '';
    this.reassignStep++;
  }

  prevReassignStep(): void {
    this.reassignStep--;
    this.reassignError = '';
  }

  confirmReassignment(): void {
    if (!this.targetStaffMember || !this.detail || this.selectedRoomsToReassign.size === 0) return;

    this.isReassigning = true;
    this.reassignError = '';

    const roomsToMove = Array.from(this.selectedRoomsToReassign);
    const targetStaffId = this.targetStaffMember.id;

    // 1. Prepare new room list for current staff (remove selected)
    const currentRoomIds = (this.detail.assignedRooms ?? []).map(r => r.roomId);
    const remainingRoomIds = currentRoomIds.filter(id => !this.selectedRoomsToReassign.has(id));

    // 2. Fetch target staff's current rooms to append to them
    this.hospitalStaffService.getStaffDetail(targetStaffId).subscribe({
      next: (targetDetail) => {
        const targetCurrentRoomIds = (targetDetail.assignedRooms ?? []).map(r => r.roomId);
        const targetNewRoomIds = [...new Set([...targetCurrentRoomIds, ...roomsToMove])];

        // 3. Execute updates sequentially
        this.hospitalStaffService.assignRooms(this.staffId, { roomIds: remainingRoomIds }).subscribe({
          next: () => {
            this.hospitalStaffService.assignRooms(targetStaffId, { roomIds: targetNewRoomIds }).subscribe({
              next: () => {
                this.isReassigning = false;
                this.showReassignModal = false;
                this.loadData(); // Refresh UI
                this.successMessage = `Successfully moved ${roomsToMove.length} room(s) to ${this.targetStaffMember?.firstName}.`;
                setTimeout(() => this.successMessage = '', 5000);
              },
              error: (err) => {
                this.isReassigning = false;
                this.reassignError = 'Failed to assign rooms to target staff.';
                console.error(err);
              }
            });
          },
          error: (err) => {
            this.isReassigning = false;
            this.reassignError = 'Failed to remove rooms from current staff.';
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.isReassigning = false;
        this.reassignError = 'Failed to fetch target staff assignment state.';
        console.error(err);
      }
    });
  }
}
