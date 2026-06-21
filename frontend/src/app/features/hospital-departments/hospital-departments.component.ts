import { Component, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HospitalStructureService } from '../../core/services/hospital-structure.service';
import {
  Bed,
  Department,
  Floor,
  Room,
  RoomStatus,
} from '../hospital-structure/models/hospital-structure.model';

@Component({
  selector: 'app-hospital-departments',
  templateUrl: './hospital-departments.component.html',
  styleUrl: './hospital-departments.component.css'
})
export class HospitalDepartmentsComponent implements OnInit {
  departments: Department[] = [];
  searchTerm = '';
  departmentFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' | 'WITH_ROOMS' | 'WITHOUT_ROOMS' = 'ALL';
  sortBy: 'NAME_ASC' | 'NAME_DESC' | 'ROOMS_DESC' | 'BEDS_DESC' | 'OCCUPANCY_DESC' = 'NAME_ASC';

  departmentFilterOptions = [
    { label: 'All Departments', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
    { label: 'With Rooms', value: 'WITH_ROOMS' },
    { label: 'Without Rooms', value: 'WITHOUT_ROOMS' },
  ];

  departmentSortOptions = [
    { label: 'Name (A-Z)', value: 'NAME_ASC' },
    { label: 'Name (Z-A)', value: 'NAME_DESC' },
    { label: 'Most Rooms', value: 'ROOMS_DESC' },
    { label: 'Most Beds', value: 'BEDS_DESC' },
    { label: 'Highest Occupancy', value: 'OCCUPANCY_DESC' },
  ];
  allRooms: Room[] = [];
  allFloors: Floor[] = [];

  showRoomsPanel = false;
  selectedDepartment: Department | null = null;
  groupedRooms: Array<{ floor: Floor | null; rooms: Room[] }> = [];
  occupiedBedsByRoom: Record<string, number> = {};
  totalBedsByRoom: Record<string, number> = {};

  isLoading = false;
  errorMessage = '';

  showModal = false;
  showDeleteModal = false;
  isEditMode = false;
  departmentModalErrorMessage = '';
  departmentFormSubmitted = false;
  departmentFieldErrors: Record<string, string> = {};
  deleteMode: 'choose' | 'reassign' = 'choose';
  reassignTargetDepartmentId = '';
  isDeletingDepartment = false;
  deleteModalErrorMessage = '';

  readonly colorPresets = [
    '#0092DF', // Corporate Blue
    '#10B981', // Success Green
    '#F87171', // Soft Red
    '#FBBF24', // Warning Amber
    '#818CF8', // Indigo
    '#C084FC', // Purple
    '#2DD4BF', // Teal
    '#94A3B8', // Slate
  ];

  formData: {
    id: string | null;
    name: string;
    description: string;
    color: string;
  } = {
    id: null,
    name: '',
    description: '',
    color: this.colorPresets[0],
  };

  departmentToDelete: Department | null = null;

  constructor(
    private hospitalStructureService: HospitalStructureService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  get displayedDepartments(): Department[] {
    let filtered = [...this.departments];

    const query = this.searchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((department) =>
        department.name.toLowerCase().includes(query) ||
        (department.description || '').toLowerCase().includes(query),
      );
    }

    switch (this.departmentFilter) {
      case 'ACTIVE':
        filtered = filtered.filter((department) => (department.status || 'ACTIVE') === 'ACTIVE');
        break;
      case 'INACTIVE':
        filtered = filtered.filter((department) => department.status === 'INACTIVE');
        break;
      case 'WITH_ROOMS':
        filtered = filtered.filter((department) => Math.max(department.roomCount || 0, 0) > 0);
        break;
      case 'WITHOUT_ROOMS':
        filtered = filtered.filter((department) => Math.max(department.roomCount || 0, 0) === 0);
        break;
      case 'ALL':
      default:
        break;
    }

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'NAME_DESC':
          return b.name.localeCompare(a.name);
        case 'ROOMS_DESC':
          return Math.max(b.roomCount || 0, 0) - Math.max(a.roomCount || 0, 0);
        case 'BEDS_DESC':
          return Math.max(b.bedCount || 0, 0) - Math.max(a.bedCount || 0, 0);
        case 'OCCUPANCY_DESC':
          return this.getOccupancyValue(b) - this.getOccupancyValue(a);
        case 'NAME_ASC':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get('create') === 'department') {
        this.openCreateModal();
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
      departments: this.hospitalStructureService.getMyDepartments(),
      rooms: this.hospitalStructureService.getMyRooms(),
      floors: this.hospitalStructureService.getAllFloors(),
    }).subscribe({
      next: ({ departments, rooms, floors }) => {
        this.departments = (departments || []).map((department) => ({
          ...department,
          color: department.color || '#0092DF',
        }));
        this.allRooms = rooms || [];
        this.allFloors = (floors || []).slice().sort((a, b) => a.floorNumber - b.floorNumber);
        this.isLoading = false;

        if (this.showRoomsPanel && this.selectedDepartment) {
          this.buildGroupedRooms(this.selectedDepartment.id);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Unable to load departments.',
        );
      },
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.departmentModalErrorMessage = '';
    this.departmentFormSubmitted = false;
    this.departmentFieldErrors = {};
    this.formData = {
      id: null,
      name: '',
      description: '',
      color: this.colorPresets[0],
    };
    this.showModal = true;
  }

  openEditModal(department: Department, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.isEditMode = true;
    this.departmentModalErrorMessage = '';
    this.departmentFormSubmitted = false;
    this.departmentFieldErrors = {};
    this.formData = {
      id: department.id,
      name: department.name || '',
      description: department.description || '',
      color: department.color || '#0092DF',
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.departmentModalErrorMessage = '';
    this.departmentFormSubmitted = false;
    this.departmentFieldErrors = {};
  }

  saveDepartment(): void {
    this.departmentFormSubmitted = true;
    this.departmentFieldErrors = {};
    this.departmentModalErrorMessage = '';

    const name = this.formData.name.trim();
    const clientErrors = this.getDepartmentClientErrors(name);
    if (Object.keys(clientErrors).length > 0) {
      this.departmentFieldErrors = clientErrors;
      return;
    }

    const payload: Partial<Department> = {
      name,
      description: this.formData.description.trim(),
      color: this.formData.color,
      status: 'ACTIVE',
    };

    if (this.isEditMode && this.formData.id) {
      this.hospitalStructureService
        .updateDepartment(this.formData.id, payload)
        .subscribe({
          next: () => {
            this.closeModal();
            this.loadData();
          },
          error: (err) => {
            if (!this.applyDepartmentBackendFieldErrors(err)) {
              this.departmentModalErrorMessage = this.authService.getFriendlyErrorMessage(
                err,
                'Failed to update department.',
              );
            }
          },
        });
      return;
    }

    this.hospitalStructureService.createDepartment(payload).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        if (!this.applyDepartmentBackendFieldErrors(err)) {
          this.departmentModalErrorMessage = this.authService.getFriendlyErrorMessage(
            err,
            'Failed to create department.',
          );
        }
      },
    });
  }

  get isDepartmentSubmitDisabled(): boolean {
    const name = this.formData.name.trim();
    return Object.keys(this.getDepartmentClientErrors(name)).length > 0;
  }

  private getDepartmentClientErrors(name: string): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!name) {
      errors['name'] = 'Department name is required.';
      return errors;
    }

    if (name.length < 6) {
      errors['name'] = 'Department name must be at least 6 characters.';
      return errors;
    }

    if (name.length > 100) {
      errors['name'] = 'Department name must be at most 100 characters.';
    }

    return errors;
  }

  private applyDepartmentBackendFieldErrors(err: any): boolean {
    const backendErrors = err?.error?.errors as Record<string, string> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mappedErrors: Record<string, string> = {};
    if (backendErrors['name']) {
      mappedErrors['name'] = backendErrors['name'];
    }
    if (backendErrors['description']) {
      mappedErrors['description'] = backendErrors['description'];
    }

    this.departmentFieldErrors = mappedErrors;
    return Object.keys(mappedErrors).length > 0;
  }

  isDepartmentFieldInvalid(field: string, model: NgModel): boolean {
    if (this.departmentFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.departmentFormSubmitted);
  }

  getDepartmentFieldError(field: string, model: NgModel): string {
    const backendError = this.departmentFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      return field === 'name' ? 'Department name is required.' : 'This field is required.';
    }

    if (model.errors['minlength']) {
      return field === 'name' ? 'Department name must be at least 6 characters.' : 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      return field === 'name' ? 'Department name must be at most 100 characters.' : 'Value is too long.';
    }

    return '';
  }

  askDelete(department: Department, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.departmentToDelete = department;
    this.deleteMode = 'choose';
    this.reassignTargetDepartmentId = '';
    this.isDeletingDepartment = false;
    this.deleteModalErrorMessage = '';
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.isDeletingDepartment) {
      return;
    }
    this.showDeleteModal = false;
    this.departmentToDelete = null;
    this.deleteMode = 'choose';
    this.reassignTargetDepartmentId = '';
    this.deleteModalErrorMessage = '';
  }

  confirmDelete(): void {
    if (!this.departmentToDelete) {
      return;
    }

    this.isDeletingDepartment = true;
    this.deleteModalErrorMessage = '';
    this.hospitalStructureService.deleteDepartmentWithAction(this.departmentToDelete.id, {
      action: 'DELETE_CASCADE',
    }).subscribe({
      next: () => {
        this.isDeletingDepartment = false;
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.isDeletingDepartment = false;
        this.deleteModalErrorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to delete department.',
        );
      },
    });
  }

  openReassignMode(): void {
    if (this.isReassignOptionDisabled) {
      this.deleteModalErrorMessage = '';
      return;
    }

    this.deleteMode = 'reassign';
    this.deleteModalErrorMessage = '';
    this.reassignTargetDepartmentId = this.reassignCandidates[0]?.id || '';
  }

  backToDeleteChoices(): void {
    this.deleteMode = 'choose';
    this.deleteModalErrorMessage = '';
  }

  confirmReassignAndDelete(): void {
    if (!this.departmentToDelete) {
      return;
    }

    if (this.isReassignOptionDisabled) {
      this.deleteModalErrorMessage = this.reassignUnavailableMessage;
      return;
    }

    if (!this.reassignTargetDepartmentId) {
      this.deleteModalErrorMessage = 'Please select a department to reassign rooms and staff.';
      return;
    }

    this.isDeletingDepartment = true;
    this.deleteModalErrorMessage = '';
    this.hospitalStructureService.deleteDepartmentWithAction(this.departmentToDelete.id, {
      action: 'REASSIGN_AND_DELETE',
      targetDepartmentId: this.reassignTargetDepartmentId,
    }).subscribe({
      next: () => {
        this.isDeletingDepartment = false;
        this.closeDeleteModal();
        this.loadData();
      },
      error: (err) => {
        this.isDeletingDepartment = false;
        this.deleteModalErrorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to reassign and delete department.',
        );
      },
    });
  }

  get reassignCandidates(): Department[] {
    if (!this.departmentToDelete) {
      return [];
    }

    return this.departments.filter((department) => department.id !== this.departmentToDelete?.id);
  }

  get reassignDepartmentOptions(): Array<{ label: string; value: string }> {
    return this.reassignCandidates.map((department) => ({
      label: department.name,
      value: department.id,
    }));
  }

  get departmentToDeleteRoomCount(): number {
    if (!this.departmentToDelete) {
      return 0;
    }

    const roomsFromCache = this.allRooms.filter(
      (room) => room.departmentId === this.departmentToDelete?.id,
    ).length;

    if (roomsFromCache > 0) {
      return roomsFromCache;
    }

    return Math.max(this.departmentToDelete.roomCount || 0, 0);
  }

  get hasAnotherDepartmentForReassign(): boolean {
    return this.reassignCandidates.length > 0;
  }

  get isReassignOptionDisabled(): boolean {
    return !this.hasAnotherDepartmentForReassign || this.departmentToDeleteRoomCount === 0;
  }

  get reassignUnavailableMessage(): string {
    if (!this.hasAnotherDepartmentForReassign && this.departmentToDeleteRoomCount === 0) {
      return 'Not available — no other departments or rooms to reassign.';
    }

    if (!this.hasAnotherDepartmentForReassign) {
      return 'Not available — no other departments exist.';
    }

    return 'Not available — no rooms to reassign.';
  }

  get reassignHelperMessage(): string {
    if (!this.hasAnotherDepartmentForReassign) {
      return 'Create another department to enable this option.';
    }

    if (this.departmentToDeleteRoomCount === 0) {
      return 'This department has no rooms to transfer.';
    }

    return '';
  }

  openRoomsPanel(department: Department, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    this.selectedDepartment = department;
    this.buildGroupedRooms(department.id);
    this.showRoomsPanel = true;
  }

  closeRoomsPanel(): void {
    this.showRoomsPanel = false;
    this.selectedDepartment = null;
    this.groupedRooms = [];
    this.occupiedBedsByRoom = {};
    this.totalBedsByRoom = {};
  }

  private buildGroupedRooms(departmentId: string): void {
    const roomsInDepartment = this.allRooms.filter(
      (room) => room.departmentId === departmentId,
    );

    const roomsByFloor = new Map<string, Room[]>();
    roomsInDepartment.forEach((room) => {
      const key = room.floorId || 'unknown';
      const existing = roomsByFloor.get(key) || [];
      existing.push(room);
      roomsByFloor.set(key, existing);
    });

    this.groupedRooms = Array.from(roomsByFloor.entries())
      .map(([floorId, rooms]) => {
        const floor = this.allFloors.find((item) => item.id === floorId) || null;
        const sortedRooms = rooms.slice().sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
        return { floor, rooms: sortedRooms };
      })
      .sort((a, b) => {
        const floorNumberA = a.floor?.floorNumber ?? Number.MAX_SAFE_INTEGER;
        const floorNumberB = b.floor?.floorNumber ?? Number.MAX_SAFE_INTEGER;
        return floorNumberA - floorNumberB;
      });

    this.loadBedCountsForRooms(roomsInDepartment);
  }

  private loadBedCountsForRooms(rooms: Room[]): void {
    if (!rooms.length) {
      this.occupiedBedsByRoom = {};
      this.totalBedsByRoom = {};
      return;
    }

    const requests = rooms.map((room) =>
      this.hospitalStructureService.getBedsByRoom(room.id).pipe(
        map((beds: Bed[]) => ({
          roomId: room.id,
          totalBeds: beds.length,
          occupiedBeds: beds.filter((bed) => bed.status === 'OCCUPIED').length,
        })),
        catchError(() =>
          of({
            roomId: room.id,
            totalBeds: room.capacity || 0,
            occupiedBeds: 0,
          }),
        ),
      ),
    );

    forkJoin(requests).subscribe((stats) => {
      const occupied: Record<string, number> = {};
      const totals: Record<string, number> = {};

      stats.forEach((item) => {
        occupied[item.roomId] = item.occupiedBeds;
        totals[item.roomId] = item.totalBeds;
      });

      this.occupiedBedsByRoom = occupied;
      this.totalBedsByRoom = totals;
    });
  }

  navigateToRoom(room: Room): void {
    if (!room.floorId || !room.id || !this.selectedDepartment) {
      return;
    }

    this.router.navigate(['/hospital/hospital-structure/floor', room.floorId, 'room', room.id], {
      queryParams: {
        departmentId: this.selectedDepartment.id,
        departmentName: this.selectedDepartment.name,
      },
    });
  }

  getOccupancyValue(department: Department): number {
    return Math.max(0, Math.min(100, Math.round(department.occupancyRate || 0)));
  }

  getStatusClass(status?: RoomStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'available';
      case 'OCCUPIED':
        return 'occupied';
      case 'MAINTENANCE':
        return 'maintenance';
      default:
        return 'unknown';
    }
  }

  getFloorName(floor: Floor | null): string {
    if (!floor) {
      return 'Unknown Floor';
    }
    return floor.name || `Floor ${floor.floorNumber}`;
  }

  getTotalBeds(room: Room): number {
    return this.totalBedsByRoom[room.id] ?? room.capacity ?? 0;
  }

  clearDepartmentFilters(): void {
    this.searchTerm = '';
    this.departmentFilter = 'ALL';
    this.sortBy = 'NAME_ASC';
  }

  getOccupiedBeds(room: Room): number {
    return this.occupiedBedsByRoom[room.id] ?? 0;
  }

}
