import { Component, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Floor } from '../../models/hospital-structure.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HospitalStructureService } from '../../../../core/services/hospital-structure.service';
import { catchError, forkJoin, map, of } from 'rxjs';

@Component({
  selector: 'app-structure-overview',
  templateUrl: './structure-overview.component.html',
  styleUrls: ['./structure-overview.component.css'],
})
export class StructureOverviewComponent implements OnInit {
  floors: Floor[] = [];
  floorRoomCounts: Record<string, number> = {};
  floorBedCounts: Record<string, number> = {};
  selectedFloorId: string | null = null;
  searchTerm = '';
  roomFilter: 'ALL' | 'WITH_ROOMS' | 'WITHOUT_ROOMS' = 'ALL';
  sortBy: 'NUMBER_ASC' | 'NUMBER_DESC' | 'NAME_ASC' | 'ROOMS_DESC' | 'BEDS_DESC' = 'NUMBER_ASC';

  roomFilterOptions = [
    { label: 'All Floors', value: 'ALL' },
    { label: 'With Rooms', value: 'WITH_ROOMS' },
    { label: 'Without Rooms', value: 'WITHOUT_ROOMS' },
  ];

  sortOptions = [
    { label: 'Floor Number (Asc)', value: 'NUMBER_ASC' },
    { label: 'Floor Number (Desc)', value: 'NUMBER_DESC' },
    { label: 'Name (A-Z)', value: 'NAME_ASC' },
    { label: 'Most Rooms', value: 'ROOMS_DESC' },
    { label: 'Most Beds', value: 'BEDS_DESC' },
  ];

  // Modal state
  showAddFloorModal = false;
  showDeleteModal = false;
  showFloorSelectorModal = false;
  isEditMode = false;
  editingFloorId: string | null = null;
  floorToDelete: Floor | null = null;
  newFloorName = '';
  defaultFloorName = '';
  floorModalErrorMessage = '';
  floorFormSubmitted = false;
  floorFieldErrors: Record<string, string> = {};
  private pendingCreateIntent: 'floor' | 'room' | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private hospitalStructureService: HospitalStructureService,
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const intent = params.get('create');
      this.pendingCreateIntent = intent === 'floor' || intent === 'room' ? intent : null;
    });

    this.refreshFloors();
  }

  get displayedFloors(): Floor[] {
    let filtered = [...this.floors];

    const query = this.searchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((floor) =>
        floor.name.toLowerCase().includes(query) ||
        floor.floorNumber.toString().includes(query),
      );
    }

    if (this.roomFilter === 'WITH_ROOMS') {
      filtered = filtered.filter((floor) => this.getFloorRoomCount(floor) > 0);
    }

    if (this.roomFilter === 'WITHOUT_ROOMS') {
      filtered = filtered.filter((floor) => this.getFloorRoomCount(floor) === 0);
    }

    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'NUMBER_DESC':
          return b.floorNumber - a.floorNumber;
        case 'NAME_ASC':
          return a.name.localeCompare(b.name);
        case 'ROOMS_DESC':
          return this.getFloorRoomCount(b) - this.getFloorRoomCount(a);
        case 'BEDS_DESC':
          return this.getFloorBedCount(b) - this.getFloorBedCount(a);
        case 'NUMBER_ASC':
        default:
          return a.floorNumber - b.floorNumber;
      }
    });

    return filtered;
  }

  clearFloorFilters(): void {
    this.searchTerm = '';
    this.roomFilter = 'ALL';
    this.sortBy = 'NUMBER_ASC';
  }

  onFloorSelect(floor: Floor): void {
    this.selectedFloorId = floor.id;
    this.router.navigate(['/hospital/hospital-structure/floor', floor.id]);
  }

  getFloorTransform(floor: Floor, index: number, total: number): string {
    if (this.selectedFloorId === floor.id) {
      return `translateY(10px)`;
    } else if (this.selectedFloorId !== null) {
      return `translateY(40px) scale(0.95)`;
    }
    return `translateY(0)`;
  }

  getFloorOpacity(floor: Floor): number {
    if (this.selectedFloorId === null) return 1;
    if (this.selectedFloorId === floor.id) return 1;
    return 0;
  }

  addFloor(): void {
    this.isEditMode = false;
    this.editingFloorId = null;
    this.floorModalErrorMessage = '';
    this.floorFormSubmitted = false;
    this.floorFieldErrors = {};
    const nextFloorNumber = this.floors.length;
    this.defaultFloorName = `Floor ${nextFloorNumber}`;
    this.newFloorName = this.defaultFloorName;
    this.showAddFloorModal = true;
  }

  openEditModal(floor: Floor, event: MouseEvent): void {
    event.stopPropagation();
    this.isEditMode = true;
    this.editingFloorId = floor.id;
    this.floorModalErrorMessage = '';
    this.floorFormSubmitted = false;
    this.floorFieldErrors = {};
    this.newFloorName = floor.name;
    // We must keep the existing floorNumber for the update payload
    this.showAddFloorModal = true;
  }

  deleteFloor(floor: Floor, event: MouseEvent): void {
    event.stopPropagation();
    this.floorToDelete = floor;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.floorToDelete = null;
  }

  confirmDelete(): void {
    if (!this.floorToDelete) return;

    const idToDelete = this.floorToDelete.id;
    const numberToDelete = this.floorToDelete.floorNumber;

    this.hospitalStructureService.deleteFloor(idToDelete).subscribe(() => {
      // Reorder remaining floors that were above this one
      const floorsToUpdate = this.floors.filter(f => f.floorNumber > numberToDelete);

      if (floorsToUpdate.length === 0) {
        this.refreshFloors();
        this.closeDeleteModal();
        return;
      }

      // Cascade update floor numbers
      let updatesRemaining = floorsToUpdate.length;
      floorsToUpdate.forEach(floor => {
        const updatedFloor = {
          ...floor,
          floorNumber: floor.floorNumber - 1
        };
        this.hospitalStructureService.updateFloor(floor.id, updatedFloor).subscribe(() => {
          updatesRemaining--;
          if (updatesRemaining === 0) {
            this.refreshFloors();
            this.closeDeleteModal();
          }
        });
      });
    });
  }

  closeModal(): void {
    this.showAddFloorModal = false;
    this.newFloorName = '';
    this.isEditMode = false;
    this.editingFloorId = null;
    this.floorModalErrorMessage = '';
    this.floorFormSubmitted = false;
    this.floorFieldErrors = {};
  }

  onOverlayClick(event: MouseEvent): void {
    this.closeModal();
  }

  confirmAddFloor(): void {
    this.floorFormSubmitted = true;
    this.floorFieldErrors = {};
    this.floorModalErrorMessage = '';

    const name = this.newFloorName.trim();
    const clientErrors = this.getFloorClientErrors(name);
    if (Object.keys(clientErrors).length > 0) {
      this.floorFieldErrors = clientErrors;
      return;
    }

    if (this.isEditMode && this.editingFloorId) {
      // Find the existing floor to get its number
      const existingFloor = this.floors.find(f => f.id === this.editingFloorId);
      if (existingFloor) {
        // Backend requires floorNumber even for name updates
        const updatePayload = {
          name,
          floorNumber: existingFloor.floorNumber
        };
        this.hospitalStructureService.updateFloor(this.editingFloorId, updatePayload).subscribe({
          next: () => {
            this.refreshFloors();
          },
          error: (err) => {
            if (!this.applyFloorBackendFieldErrors(err)) {
              this.floorModalErrorMessage = this.authService.getFriendlyErrorMessage(
                err,
                'Failed to update floor.',
              );
            }
          },
        });
      }
    } else {
      const nextFloorNumber = this.floors.length;
      const newFloor: Partial<Floor> = {
        name,
        floorNumber: nextFloorNumber
      };

      this.hospitalStructureService.createFloor(newFloor).subscribe({
        next: () => {
          this.refreshFloors();
        },
        error: (err) => {
          if (!this.applyFloorBackendFieldErrors(err)) {
            this.floorModalErrorMessage = this.authService.getFriendlyErrorMessage(
              err,
              'Failed to create floor.',
            );
          }
        },
      });
    }
  }

  get isFloorSubmitDisabled(): boolean {
    const name = this.newFloorName.trim();
    return Object.keys(this.getFloorClientErrors(name)).length > 0;
  }

  private getFloorClientErrors(name: string): Record<string, string> {
    const errors: Record<string, string> = {};

    if (!name) {
      errors['name'] = 'Floor name is required.';
      return errors;
    }

    if (name.length < 3) {
      errors['name'] = 'Floor name must be at least 3 characters.';
      return errors;
    }

    if (name.length > 80) {
      errors['name'] = 'Floor name must be at most 80 characters.';
    }

    return errors;
  }

  private applyFloorBackendFieldErrors(err: any): boolean {
    const backendErrors = err?.error?.errors as Record<string, string> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mapped: Record<string, string> = {};
    if (backendErrors['name']) {
      mapped['name'] = backendErrors['name'];
    }

    this.floorFieldErrors = mapped;
    return Object.keys(mapped).length > 0;
  }

  isFloorFieldInvalid(field: string, model: NgModel): boolean {
    if (this.floorFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.floorFormSubmitted);
  }

  getFloorFieldError(field: string, model: NgModel): string {
    const backendError = this.floorFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      return field === 'name' ? 'Floor name is required.' : 'This field is required.';
    }

    if (model.errors['minlength']) {
      return field === 'name' ? 'Floor name must be at least 3 characters.' : 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      return field === 'name' ? 'Floor name must be at most 80 characters.' : 'Value is too long.';
    }

    return '';
  }

  private refreshFloors(): void {
    this.hospitalStructureService.getAllFloors().subscribe(floors => {
      const sortedFloors = floors.sort((a, b) => a.floorNumber - b.floorNumber);

      if (sortedFloors.length === 0) {
        this.floors = [];
        this.floorRoomCounts = {};
        this.floorBedCounts = {};
        this.closeModal();
        return;
      }

      const floorStatsRequests = sortedFloors.map((floor) =>
        this.hospitalStructureService.getRoomsByFloor(floor.id).pipe(
          map((rooms) => ({
            floorId: floor.id,
            roomCount: rooms.length,
            bedCount: rooms.reduce((total, room) => total + Math.max(room.bedCount || 0, 0), 0),
          })),
          catchError(() =>
            of({
              floorId: floor.id,
              roomCount: Math.max(floor.roomCount || 0, 0),
              bedCount: Math.max(floor.bedCount || 0, 0),
            }),
          ),
        ),
      );

      forkJoin(floorStatsRequests).subscribe((stats) => {
        this.floorRoomCounts = stats.reduce<Record<string, number>>((acc, current) => {
          acc[current.floorId] = current.roomCount;
          return acc;
        }, {});

        this.floorBedCounts = stats.reduce<Record<string, number>>((acc, current) => {
          acc[current.floorId] = current.bedCount;
          return acc;
        }, {});

        this.floors = sortedFloors.map((floor) => ({
          ...floor,
          roomCount: this.floorRoomCounts[floor.id] ?? Math.max(floor.roomCount || 0, 0),
          bedCount: this.floorBedCounts[floor.id] ?? Math.max(floor.bedCount || 0, 0),
        }));

        this.handleCreateIntent();
        this.closeModal();
      });
    });
  }

  private handleCreateIntent(): void {
    if (!this.pendingCreateIntent) {
      return;
    }

    if (this.pendingCreateIntent === 'floor') {
      this.pendingCreateIntent = null;
      this.addFloor();
      this.clearCreateQueryParam();
      return;
    }

    if (this.pendingCreateIntent === 'room') {
      if (this.floors.length === 0) {
        this.pendingCreateIntent = null;
        this.addFloor();
        this.clearCreateQueryParam();
        return;
      }

      // Show floor selector modal for user to pick which floor to add room to
      this.showFloorSelectorModal = true;
      this.clearCreateQueryParam();
    }
  }

  selectFloorForRoom(floor: Floor): void {
    this.showFloorSelectorModal = false;
    this.router.navigate(['/hospital/hospital-structure/floor', floor.id], {
      queryParams: { create: 'room' },
    });
  }

  closeFloorSelectorModal(): void {
    this.showFloorSelectorModal = false;
    this.pendingCreateIntent = null;
  }

  private clearCreateQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { create: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  getFloorRoomCount(floor: Floor): number {
    return this.floorRoomCounts[floor.id] ?? Math.max(floor.roomCount || 0, 0);
  }

  getFloorBedCount(floor: Floor): number {
    return this.floorBedCounts[floor.id] ?? Math.max(floor.bedCount || 0, 0);
  }

}
