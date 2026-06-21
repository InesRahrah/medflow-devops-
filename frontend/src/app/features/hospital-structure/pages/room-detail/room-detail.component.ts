import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Room,
  Bed,
  Floor,
  Department,
  getRoomCapacityValidationError,
  ROOM_TYPE_CONFIG,
  RoomTypeConfig,
  ROOM_TYPE_UNLIMITED_BEDS,
  getEffectiveRoomBedLimit,
  getRoomHardCapacity,
  getRoomTypeCapacityForForm,
  getRoomTypeMaxBeds,
  isRoomAtBedLimit,
  normalizeRoomCapacityForSubmission,
  normalizeRoomCapacity,
} from '../../models/hospital-structure.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HospitalStructureService } from '../../../../core/services/hospital-structure.service';

@Component({
  selector: 'app-room-detail',
  templateUrl: './room-detail.component.html',
  styleUrls: ['./room-detail.component.css'],
})
export class RoomDetailComponent implements OnInit, OnDestroy {
  private readonly GRID_SNAP = 24;
  private readonly SURFACE_PADDING = 24;
  private readonly SURFACE_WIDTH = 1200;
  private readonly SURFACE_HEIGHT = 700;
  private readonly DEFAULT_BED_WIDTH = 140;
  private readonly DEFAULT_BED_HEIGHT = 180;

  room: Room | undefined;
  floor: Floor | undefined;
  beds: Bed[] = [];
  floorId!: string;
  roomId!: string;

  floorRooms: Room[] = [];
  allFloors: Floor[] = [];
  departments: Department[] = [];
  showRoomDropdown = false;
  showFloorDropdown = false;

  editMode: boolean = false;
  draggedBedIndex: number | null = null;
  draggedBedId: string | null = null;
  selectedBedId: string | null = null;

  // Bed CRUD State
  showBedModal = false;
  isBedEditMode = false;
  currentBed: Partial<Bed> = {};
  bedFormWarningMessage: string | null = null;
  bedFormSubmitted = false;
  bedFieldErrors: Record<string, string> = {};

  // Room edit state
  showRoomModal = false;
  roomFormSubmitted = false;
  roomModalErrorMessage = '';
  roomFieldErrors: Record<string, string> = {};
  currentRoom: Partial<Room> = {};

  // Popup positioning
  popupMenuStyles: any = {};
  private popupTrackFrame: number | null = null;
  private readonly pendingBedPositionSaves = new Map<string, ReturnType<typeof setTimeout>>();

  statusOptions = [
    { label: 'Free', value: 'FREE' },
    { label: 'Occupied', value: 'OCCUPIED' },
    { label: 'Reserved', value: 'RESERVED' },
    { label: 'Out of Service', value: 'OUT_OF_SERVICE' },
  ];

  typeOptions = [
    { label: 'Standard', value: 'STANDARD' },
    { label: 'ICU', value: 'ICU' },
    { label: 'Emergency', value: 'EMERGENCY' },
  ];

  roomTypeOptions = [
    { label: 'Normal', value: 'Normal' },
    { label: 'ICU', value: 'ICU' },
    { label: 'Ward', value: 'WARD' },
    { label: 'Emergency', value: 'EMERGENCY' },
    { label: 'Operating Room', value: 'OR' },
  ];

  roomStatusOptions = [
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Occupied', value: 'OCCUPIED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private hospitalService: HospitalStructureService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.floorId = params.get('floorId') as string;
      this.roomId = params.get('roomId') as string;
      this.loadDepartments();
      this.loadRoomData();
    });
  }

  ngOnDestroy(): void {
    this.stopPopupTracking();
    this.pendingBedPositionSaves.forEach((timer) => clearTimeout(timer));
    this.pendingBedPositionSaves.clear();
  }

  loadDepartments(): void {
    this.hospitalService.getMyDepartments().subscribe((deps) => {
      this.departments = deps;
      if (this.room) {
        this.resolveDepartmentName();
      }
    });
  }

  resolveDepartmentName(): void {
    if (this.room && this.room.departmentId) {
      const dep = this.departments.find(
        (d) => d.id === this.room?.departmentId,
      );
      if (dep) {
        this.room.departmentName = dep.name;
      }
    }
  }

  loadRoomData(): void {
    this.hospitalService.getAllFloors().subscribe((floors) => {
      this.allFloors = floors;
      this.floor = floors.find((f) => f.id === this.floorId);
    });
    this.hospitalService.getRoomsByFloor(this.floorId).subscribe((rooms) => {
      this.floorRooms = rooms;
      this.room = rooms.find((r) => r.id === this.roomId);
      if (this.room && this.departments.length > 0) {
        this.resolveDepartmentName();
      }
    });
    this.hospitalService.getBedsByRoom(this.roomId).subscribe((beds) => {
      this.beds = this.applyLayoutConstraints(beds);
    });
  }

  toggleRoomDropdown(): void {
    this.showRoomDropdown = !this.showRoomDropdown;
    if (this.showRoomDropdown) this.showFloorDropdown = false;
  }

  toggleFloorDropdown(): void {
    this.showFloorDropdown = !this.showFloorDropdown;
    if (this.showFloorDropdown) this.showRoomDropdown = false;
  }

  switchFloor(floorId: string): void {
    this.showFloorDropdown = false;
    this.router.navigate(['/hospital/hospital-structure/floor', floorId]);
  }

  switchRoom(roomId: string): void {
    this.showRoomDropdown = false;
    this.router.navigate([
      '/hospital/hospital-structure/floor',
      this.floorId,
      'room',
      roomId,
    ]);
  }

  openEditRoomModal(): void {
    if (!this.room) {
      return;
    }

    this.roomFormSubmitted = false;
    this.roomModalErrorMessage = '';
    this.roomFieldErrors = {};
    this.currentRoom = { ...this.room };
    this.onRoomTypeChange();
    this.showRoomModal = true;
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.roomFormSubmitted = false;
    this.roomModalErrorMessage = '';
    this.roomFieldErrors = {};
    this.currentRoom = {};
  }

  onRoomTypeChange(): void {
    if (!this.currentRoom.type) {
      return;
    }

    const roomType = this.currentRoom.type;
    const fallbackCapacity = getRoomTypeCapacityForForm(roomType);
    const currentCapacity = Number(this.currentRoom.capacity);
    const safeCapacity = Number.isFinite(currentCapacity)
      ? currentCapacity
      : fallbackCapacity;
    this.currentRoom.capacity = normalizeRoomCapacityForSubmission(
      roomType,
      safeCapacity,
    );

    const capacityError = getRoomCapacityValidationError(
      roomType,
      this.currentRoom.capacity,
    );
    if (capacityError) {
      this.roomFieldErrors['capacity'] = capacityError;
    } else {
      delete this.roomFieldErrors['capacity'];
    }
  }

  confirmRoomUpdate(): void {
    if (!this.room?.id) {
      return;
    }

    this.roomFormSubmitted = true;
    this.roomFieldErrors = {};
    this.roomModalErrorMessage = '';

    const clientErrors = this.getRoomClientErrors();
    if (Object.keys(clientErrors).length > 0) {
      this.roomFieldErrors = clientErrors;
      return;
    }

    const payload: Partial<Room> = {
      roomNumber: (this.currentRoom.roomNumber || '').trim(),
      type: this.currentRoom.type,
      status: this.currentRoom.status || 'AVAILABLE',
      floorId: this.floorId,
      capacity: normalizeRoomCapacityForSubmission(
        this.currentRoom.type,
        Number(this.currentRoom.capacity),
      ),
      departmentId: this.currentRoom.departmentId,
      x: this.room.x,
      y: this.room.y,
      width: this.room.width,
      height: this.room.height,
    };

    this.hospitalService.updateRoom(this.room.id, payload).subscribe({
      next: () => {
        this.closeRoomModal();
        this.loadRoomData();
      },
      error: (err) => {
        const backendErrors = err?.error?.errors as Record<string, string> | undefined;
        if (backendErrors) {
          this.roomFieldErrors = {
            ...(backendErrors['roomNumber'] ? { roomNumber: backendErrors['roomNumber'] } : {}),
            ...(backendErrors['type'] ? { type: backendErrors['type'] } : {}),
            ...(backendErrors['departmentId'] ? { departmentId: backendErrors['departmentId'] } : {}),
            ...(backendErrors['status'] ? { status: backendErrors['status'] } : {}),
            ...(backendErrors['capacity'] ? { capacity: backendErrors['capacity'] } : {}),
          };
          if (Object.keys(this.roomFieldErrors).length > 0) {
            return;
          }
        }

        this.roomModalErrorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Failed to update room.',
        );
      },
    });
  }

  private getRoomClientErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    const roomNumber = (this.currentRoom.roomNumber || '').trim();
    if (!roomNumber) {
      errors['roomNumber'] = 'Room number is required.';
      return errors;
    }

    if (roomNumber.length < 2) {
      errors['roomNumber'] = 'Room number must be at least 2 characters.';
      return errors;
    }

    if (roomNumber.length > 30) {
      errors['roomNumber'] = 'Room number must be at most 30 characters.';
    }

    if (!this.currentRoom.type) {
      errors['type'] = 'Room type is required.';
    }

    if (!this.currentRoom.departmentId) {
      errors['departmentId'] = 'Department is required.';
    }

    if (!this.currentRoom.status) {
      errors['status'] = 'Room status is required.';
    }

    if (this.currentRoom.type) {
      const capacityError = getRoomCapacityValidationError(
        this.currentRoom.type,
        this.currentRoom.capacity,
      );
      if (capacityError) {
        errors['capacity'] = capacityError;
      }
    }

    return errors;
  }

  get isRoomSubmitDisabled(): boolean {
    return Object.keys(this.getRoomClientErrors()).length > 0;
  }

  isRoomFieldInvalid(field: string, model: NgModel): boolean {
    if (this.roomFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.roomFormSubmitted);
  }

  getRoomFieldError(field: string, model: NgModel): string {
    const backendError = this.roomFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      switch (field) {
        case 'roomNumber':
          return 'Room number is required.';
        case 'type':
          return 'Room type is required.';
        case 'departmentId':
          return 'Department is required.';
        case 'status':
          return 'Room status is required.';
        case 'capacity':
          return 'Capacity is required.';
        default:
          return 'This field is required.';
      }
    }

    if (model.errors['minlength']) {
      return field === 'roomNumber'
        ? 'Room number must be at least 2 characters.'
        : 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      return field === 'roomNumber'
        ? 'Room number must be at most 30 characters.'
        : 'Value is too long.';
    }

    if (model.errors['min']) {
      if (field === 'capacity') {
        return this.currentRoom.type === 'OR'
          ? 'Operating rooms cannot contain beds.'
          : 'Capacity must be at least 1 for this room type.';
      }
      return 'Value is below the minimum.';
    }

    if (model.errors['max'] && field === 'capacity') {
      const capacityError = getRoomCapacityValidationError(
        this.currentRoom.type,
        this.currentRoom.capacity,
      );
      return capacityError || 'Capacity exceeds allowed maximum for this room type.';
    }

    return '';
  }

  toggleEditMode(): void {
    if (!this.editMode) {
      this.editMode = true;
    } else {
      this.editMode = false;
      this.selectedBedId = null;
      this.popupMenuStyles = {};
      this.stopPopupTracking();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.selectedBedId) {
      this.calculatePopupPosition(this.selectedBedId);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.selectedBedId) {
      this.calculatePopupPosition(this.selectedBedId);
    }
  }

  // Drag and Drop Logic
  onDragStart(event: DragEvent, index: number): void {
    if (!this.editMode) return;
    this.draggedBedIndex = index;
    this.draggedBedId = this.beds[index]?.id ?? null;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent): void {
    if (!this.editMode) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDropOnSurface(event: DragEvent): void {
    if (
      !this.editMode ||
      this.draggedBedIndex === null ||
      this.draggedBedId === null
    )
      return;
    event.preventDefault();

    const surfaceRect = this.getSurfaceRect(event);
    const draggedBed = this.beds.find((b) => b.id === this.draggedBedId);
    if (!draggedBed || !surfaceRect) {
      this.clearDragState();
      return;
    }

    const bedWidth = this.getBedWidth(draggedBed);
    const bedHeight = this.getBedHeight(draggedBed);
    const intendedX = event.clientX - surfaceRect.left - bedWidth / 2;
    const intendedY = event.clientY - surfaceRect.top - bedHeight / 2;
    const resolved = this.findNearestFreePosition(
      intendedX,
      intendedY,
      draggedBed.id,
      surfaceRect.width,
      surfaceRect.height,
      bedWidth,
      bedHeight,
    );

    const updatedBed: Bed = {
      ...draggedBed,
      x: resolved.x,
      y: resolved.y,
      width: bedWidth,
      height: bedHeight,
    };

    this.beds = this.beds.map((bed) =>
      bed.id === draggedBed.id ? updatedBed : bed,
    );
    this.updateBedPosition(updatedBed);

    this.clearDragState();
  }

  getBedX(bed: Bed): number {
    return typeof bed.x === 'number' ? bed.x : this.SURFACE_PADDING;
  }

  getBedY(bed: Bed): number {
    return typeof bed.y === 'number' ? bed.y : this.SURFACE_PADDING;
  }

  private clearDragState(): void {
    this.draggedBedIndex = null;
    this.draggedBedId = null;
  }

  private updateBedPosition(updatedBed: Bed): void {
    const existingTimer = this.pendingBedPositionSaves.get(updatedBed.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.hospitalService.updateBed(updatedBed.id, updatedBed).subscribe({
        next: () => {
          this.pendingBedPositionSaves.delete(updatedBed.id);
        },
        error: () => {
          this.pendingBedPositionSaves.delete(updatedBed.id);
          this.loadBeds();
        },
      });
    }, 180);

    this.pendingBedPositionSaves.set(updatedBed.id, timer);
  }

  // Bed Selection & Status
  selectBed(bedId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (!this.editMode) return;
    this.selectedBedId = this.selectedBedId === bedId ? null : bedId;

    // Calculate popup position when a bed is selected
    if (this.selectedBedId === bedId) {
      this.calculatePopupPosition(bedId);
      this.startPopupTracking();
    } else {
      this.popupMenuStyles = {};
      this.stopPopupTracking();
    }
  }

  private startPopupTracking(): void {
    this.stopPopupTracking();

    const tick = () => {
      if (this.editMode && this.selectedBedId) {
        this.calculatePopupPosition(this.selectedBedId);
        this.popupTrackFrame = window.requestAnimationFrame(tick);
      } else {
        this.stopPopupTracking();
      }
    };

    this.popupTrackFrame = window.requestAnimationFrame(tick);
  }

  private stopPopupTracking(): void {
    if (this.popupTrackFrame !== null) {
      window.cancelAnimationFrame(this.popupTrackFrame);
      this.popupTrackFrame = null;
    }
  }

  private calculatePopupPosition(bedId: string): void {
    try {
      const bed = this.beds.find((b) => b.id === bedId);
      if (!bed) return;

      const popupWidth = 220;
      const popupHeight = 310;
      const viewportWidth = window.innerWidth;
      const gap = -40;

      // Try to find the bed element multiple times
      let bedElement = document.querySelector(`[data-bed-id="${bedId}"]`);

      if (!bedElement) {
        // Fallback: try to find by searching all bed wrappers
        const allBeds = Array.from(document.querySelectorAll('[data-bed-id]'));
        bedElement =
          allBeds.find((el) => el.getAttribute('data-bed-id') === bedId) ||
          null;
      }

      if (!bedElement) return;

      const bedRect = bedElement.getBoundingClientRect();

      // Validate that we got valid coordinates
      if (bedRect.width === 0 || bedRect.height === 0) return;

      // Always anchor above the selected bed, centered horizontally.
      let left = bedRect.left + bedRect.width / 2 - popupWidth / 2;
      left = Math.max(gap, Math.min(left, viewportWidth - popupWidth - gap));

      // Always keep popup above the bed, very close to it.
      const top = bedRect.top - popupHeight - gap;

      const newStyles = {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        visibility: 'visible',
        opacity: '1',
      };

      this.popupMenuStyles = newStyles;
    } catch {
      // Ignore positioning errors; menu simply won't render until next interaction.
    }
  }
  changeBedStatus(
    bedId: string,
    newStatus: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE',
  ): void {
    const bed = this.beds.find((b) => b.id === bedId);
    if (bed) {
      const updatedBed = { ...bed, status: newStatus };
      this.hospitalService.updateBed(bed.id, updatedBed).subscribe(() => {
        bed.status = newStatus;
      });
    }
    // Keep menu open to allow multiple status changes
  }

  addBed(): void {
    if (this.isAtLimit) return;
    this.openAddBedModal();
  }

  openAddBedModal(): void {
    if (this.isAtCapacity) {
      return;
    }

    this.isBedEditMode = false;

    const nextPosition = this.findNextAvailablePosition();

    this.currentBed = {
      label: `Bed ${this.beds.length + 1}`,
      roomId: this.roomId,
      status: 'FREE',
      type: 'STANDARD',
      notes: '',
      x: nextPosition.x,
      y: nextPosition.y,
      width: this.DEFAULT_BED_WIDTH,
      height: this.DEFAULT_BED_HEIGHT,
    };
    this.bedFormWarningMessage = null;
    this.bedFormSubmitted = false;
    this.bedFieldErrors = {};
    this.showBedModal = true;
  }

  openEditBedModal(bed: Bed, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isBedEditMode = true;
    this.currentBed = { ...bed };
    this.showBedModal = true;
    this.bedFormSubmitted = false;
    this.bedFieldErrors = {};
    this.selectedBedId = null; // Close the small status menu if open
    this.popupMenuStyles = {};
    this.stopPopupTracking();
  }

  closeBedModal(): void {
    this.showBedModal = false;
    this.currentBed = {};
    this.bedFormWarningMessage = null;
    this.bedFormSubmitted = false;
    this.bedFieldErrors = {};
  }

  confirmBedAction(): void {
    this.bedFormSubmitted = true;
    this.bedFieldErrors = {};

    const validationErrors = this.getBedClientErrors();
    if (Object.keys(validationErrors).length > 0) {
      this.bedFieldErrors = validationErrors;
      return;
    }

    this.bedFormWarningMessage = null;

    if (this.isBedEditMode && this.currentBed.id) {
      this.hospitalService
        .updateBed(this.currentBed.id, this.currentBed as Bed)
        .subscribe({
          next: () => {
            this.loadBeds();
            this.syncRoom();
            this.closeBedModal();
          },
          error: (err) => {
            if (!this.applyBedBackendFieldErrors(err)) {
              this.bedFormWarningMessage = err?.error?.message || 'Unable to update bed.';
            }
          },
        });
    } else {
      if (this.isAtLimit) {
        this.bedFormWarningMessage = this.limitReachedMessage;
        return;
      }

      this.hospitalService.createBed(this.currentBed).subscribe({
        next: () => {
          this.loadBeds();
          this.syncRoom();
          this.closeBedModal();
        },
        error: (err) => {
          if (!this.applyBedBackendFieldErrors(err)) {
            this.bedFormWarningMessage =
              err?.error?.message ||
              'Unable to create bed. Room may already be at full capacity.';
          }
        },
      });
    }
  }

  private getBedClientErrors(): Record<string, string> {
    const errors: Record<string, string> = {};

    const label = (this.currentBed.label || '').trim();
    if (!label) {
      errors['label'] = 'Bed label is required.';
      return errors;
    }

    if (label.length < 2) {
      errors['label'] = 'Bed label must be at least 2 characters.';
      return errors;
    }

    if (label.length > 30) {
      errors['label'] = 'Bed label must be at most 30 characters.';
    }

    if (!this.currentBed.status) {
      errors['status'] = 'Bed status is required.';
    }

    const notes = (this.currentBed.notes || '').trim();
    if (notes.length > 500) {
      errors['notes'] = 'Notes cannot exceed 500 characters.';
    }

    return errors;
  }

  private applyBedBackendFieldErrors(err: any): boolean {
    const backendErrors = err?.error?.errors as Record<string, string> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mapped: Record<string, string> = {};
    const supportedFields = ['label', 'status', 'notes'] as const;
    supportedFields.forEach((field) => {
      if (backendErrors[field]) {
        mapped[field] = backendErrors[field];
      }
    });

    this.bedFieldErrors = mapped;
    return Object.keys(mapped).length > 0;
  }

  isBedFieldInvalid(field: string, model: NgModel): boolean {
    if (this.bedFieldErrors[field]) {
      return true;
    }
    return !!model?.invalid && (model.dirty || model.touched || this.bedFormSubmitted);
  }

  getBedFieldError(field: string, model: NgModel): string {
    const backendError = this.bedFieldErrors[field];
    if (backendError) {
      return backendError;
    }

    if (!model?.errors) {
      return '';
    }

    if (model.errors['required']) {
      if (field === 'label') return 'Bed label is required.';
      if (field === 'status') return 'Bed status is required.';
      return 'This field is required.';
    }

    if (model.errors['minlength']) {
      if (field === 'label') return 'Bed label must be at least 2 characters.';
      return 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      if (field === 'label') return 'Bed label must be at most 30 characters.';
      if (field === 'notes') return 'Notes cannot exceed 500 characters.';
      return 'Value is too long.';
    }

    return '';
  }

  deleteBed(bedId: string, event: MouseEvent): void {
    event.stopPropagation();
    this.hospitalService.deleteBed(bedId).subscribe(() => {
      this.loadBeds();
      this.syncRoom();
    });
  }

  private loadBeds(): void {
    this.hospitalService.getBedsByRoom(this.roomId).subscribe((beds) => {
      this.beds = this.applyLayoutConstraints(beds);
    });
  }

  private applyLayoutConstraints(beds: Bed[]): Bed[] {
    const laidOut: Bed[] = [];

    for (const bed of beds) {
      const bedWidth = this.getBedWidth(bed);
      const bedHeight = this.getBedHeight(bed);
      const hasPersistedPosition =
        typeof bed.x === 'number' && typeof bed.y === 'number';

      if (hasPersistedPosition) {
        const minX = this.SURFACE_PADDING;
        const minY = this.SURFACE_PADDING;
        const maxX = Math.max(
          minX,
          this.SURFACE_WIDTH - bedWidth - this.SURFACE_PADDING,
        );
        const maxY = Math.max(
          minY,
          this.SURFACE_HEIGHT - bedHeight - this.SURFACE_PADDING,
        );

        laidOut.push({
          ...bed,
          x: this.snapToGrid(this.clamp(bed.x as number, minX, maxX)),
          y: this.snapToGrid(this.clamp(bed.y as number, minY, maxY)),
          width: bedWidth,
          height: bedHeight,
        });
        continue;
      }

      const resolved = this.findNearestFreePosition(
        this.SURFACE_PADDING,
        this.SURFACE_PADDING,
        bed.id,
        this.SURFACE_WIDTH,
        this.SURFACE_HEIGHT,
        bedWidth,
        bedHeight,
        laidOut,
      );

      laidOut.push({
        ...bed,
        x: resolved.x,
        y: resolved.y,
        width: bedWidth,
        height: bedHeight,
      });
    }

    return laidOut;
  }

  private findNextAvailablePosition(): { x: number; y: number } {
    return this.findNearestFreePosition(
      this.SURFACE_PADDING,
      this.SURFACE_PADDING,
      null,
      this.SURFACE_WIDTH,
      this.SURFACE_HEIGHT,
      this.DEFAULT_BED_WIDTH,
      this.DEFAULT_BED_HEIGHT,
    );
  }

  private findNearestFreePosition(
    targetX: number,
    targetY: number,
    excludeBedId: string | null,
    surfaceWidth: number,
    surfaceHeight: number,
    bedWidth: number,
    bedHeight: number,
    bedPool?: Bed[],
  ): { x: number; y: number } {
    const minX = this.SURFACE_PADDING;
    const minY = this.SURFACE_PADDING;
    const maxX = Math.max(minX, surfaceWidth - bedWidth - this.SURFACE_PADDING);
    const maxY = Math.max(
      minY,
      surfaceHeight - bedHeight - this.SURFACE_PADDING,
    );

    const snappedStartX = this.snapToGrid(this.clamp(targetX, minX, maxX));
    const snappedStartY = this.snapToGrid(this.clamp(targetY, minY, maxY));

    if (
      !this.hasCollision(
        snappedStartX,
        snappedStartY,
        bedWidth,
        bedHeight,
        excludeBedId,
        bedPool,
      )
    ) {
      return { x: snappedStartX, y: snappedStartY };
    }

    const maxRing = 40;
    for (let ring = 1; ring <= maxRing; ring++) {
      for (let dx = -ring; dx <= ring; dx++) {
        for (let dy = -ring; dy <= ring; dy++) {
          const isPerimeter = Math.abs(dx) === ring || Math.abs(dy) === ring;
          if (!isPerimeter) continue;

          const candidateX = this.snapToGrid(
            this.clamp(snappedStartX + dx * this.GRID_SNAP, minX, maxX),
          );
          const candidateY = this.snapToGrid(
            this.clamp(snappedStartY + dy * this.GRID_SNAP, minY, maxY),
          );

          if (
            !this.hasCollision(
              candidateX,
              candidateY,
              bedWidth,
              bedHeight,
              excludeBedId,
              bedPool,
            )
          ) {
            return { x: candidateX, y: candidateY };
          }
        }
      }
    }

    return { x: snappedStartX, y: snappedStartY };
  }

  private hasCollision(
    x: number,
    y: number,
    width: number,
    height: number,
    excludeBedId: string | null,
    bedPool?: Bed[],
  ): boolean {
    const pool = bedPool ?? this.beds;
    for (const bed of pool) {
      if (excludeBedId && bed.id === excludeBedId) continue;
      const bx = this.getBedX(bed);
      const by = this.getBedY(bed);
      const bw = this.getBedWidth(bed);
      const bh = this.getBedHeight(bed);
      const intersects =
        x < bx + bw && x + width > bx && y < by + bh && y + height > by;
      if (intersects) {
        return true;
      }
    }
    return false;
  }

  private getBedWidth(bed: Partial<Bed>): number {
    return typeof bed.width === 'number' && bed.width > 0
      ? bed.width
      : this.DEFAULT_BED_WIDTH;
  }

  private getBedHeight(bed: Partial<Bed>): number {
    return typeof bed.height === 'number' && bed.height > 0
      ? bed.height
      : this.DEFAULT_BED_HEIGHT;
  }

  private snapToGrid(value: number): number {
    return Math.round(value / this.GRID_SNAP) * this.GRID_SNAP;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private getSurfaceRect(event: DragEvent): DOMRect | null {
    const target = event.currentTarget as HTMLElement | null;
    return target ? target.getBoundingClientRect() : null;
  }

  private syncRoom(): void {
    this.hospitalService.getRoomsByFloor(this.floorId).subscribe((rooms) => {
      const updatedRoom = rooms.find((r) => r.id === this.roomId);
      if (updatedRoom && this.room) {
        this.room.capacity = updatedRoom.capacity;
      }
    });
  }

  goToBuilding(): void {
    this.router.navigate(['/hospital/hospital-structure']);
  }

  goBack(): void {
    this.router.navigate(['/hospital/hospital-structure/floor', this.floorId]);
  }

  get freeBeds(): number {
    return this.beds.filter((b) => this.normalizeBedStatus(b.status) === 'FREE')
      .length;
  }

  get occupiedBeds(): number {
    return this.beds.filter(
      (b) => this.normalizeBedStatus(b.status) === 'OCCUPIED',
    ).length;
  }

  get reservedBeds(): number {
    return this.beds.filter(
      (b) => this.normalizeBedStatus(b.status) === 'RESERVED',
    ).length;
  }

  get outOfServiceBeds(): number {
    return this.beds.filter(
      (b) => this.normalizeBedStatus(b.status) === 'OUT_OF_SERVICE',
    ).length;
  }

  get roomTypeConfig(): RoomTypeConfig | undefined {
    return this.room?.type ? ROOM_TYPE_CONFIG[this.room.type] : undefined;
  }

  get roomTypeMaxBeds(): number {
    return getRoomTypeMaxBeds(this.room?.type);
  }

  get selectedRoomTypeMaxBeds(): number {
    return getRoomTypeMaxBeds(this.currentRoom.type);
  }

  get maxAllowedRoomCapacity(): number {
    return this.selectedRoomTypeMaxBeds === ROOM_TYPE_UNLIMITED_BEDS
      ? 999
      : Math.max(this.selectedRoomTypeMaxBeds, 0);
  }

  get showRoomCapacityLimitHint(): boolean {
    return this.currentRoom.type === 'OR' || this.selectedRoomTypeMaxBeds > 0;
  }

  get hasUnlimitedBeds(): boolean {
    return this.roomTypeMaxBeds === ROOM_TYPE_UNLIMITED_BEDS;
  }

  get hasNoBedsAllowed(): boolean {
    return this.effectiveBedLimit === 0;
  }

  get roomHardCapacity(): number {
    return getRoomHardCapacity(this.room?.type, this.room?.capacity);
  }

  get effectiveBedLimit(): number {
    return getEffectiveRoomBedLimit(this.room?.type, this.room?.capacity);
  }

  get maxBedCapacity(): number {
    return this.effectiveBedLimit;
  }

  get maxBedCapacityDisplay(): string {
    return this.hasUnlimitedBeds ? '∞' : String(this.maxBedCapacity);
  }

  get roomHardCapacityDisplay(): string {
    return String(this.roomHardCapacity);
  }

  get maxAllowedBeds(): number {
    return this.maxBedCapacity;
  }

  get isAtLimit(): boolean {
    return isRoomAtBedLimit(this.room?.type, this.room?.capacity, this.beds.length);
  }

  get isAtCapacity(): boolean {
    return this.isAtLimit;
  }

  get isCreateBedDisabled(): boolean {
    const hasValidationErrors = Object.keys(this.getBedClientErrors()).length > 0;

    if (this.isBedEditMode) {
      return hasValidationErrors;
    }

    return hasValidationErrors || this.isAtLimit;
  }

  get addBedDisabledTooltip(): string {
    return this.isAtLimit ? this.limitReachedMessage : '';
  }

  get capacityUsagePercent(): number {
    if (this.maxAllowedBeds <= 0) return 100;
    const ratio = (this.beds.length / this.maxAllowedBeds) * 100;
    return Math.max(0, Math.min(100, Math.round(ratio)));
  }

  get capacityTrackState(): 'safe' | 'warning' | 'full' {
    if (this.isAtLimit) return 'full';
    if (this.capacityUsagePercent >= 80) return 'warning';
    return 'safe';
  }

  get capacityHelperText(): string {
    return `${this.beds.length} of ${this.maxAllowedBeds} beds.`;
  }

  get capacityLimitHint(): string {
    if (!this.isAtLimit) return '';
    return `Capacity reached. Update room settings to add more beds.`;
  }

  get limitReachedMessage(): string {
    if (this.hasNoBedsAllowed) {
      return `${this.roomTypeConfig?.label || this.room?.type || 'This room'} cannot contain beds.`;
    }

    return `Room has reached its capacity of ${this.maxAllowedBeds} bed(s).`;
  }

  get departmentOptions(): Array<{ label: string; value: string }> {
    return this.departments.map((department) => ({
      label: department.name,
      value: department.id,
    }));
  }

  getBedStatusClass(status: Bed['status'] | string | undefined): string {
    switch (this.normalizeBedStatus(status)) {
      case 'OCCUPIED':
        return 'occupied';
      case 'RESERVED':
        return 'reserved';
      case 'OUT_OF_SERVICE':
        return 'out_of_service';
      case 'FREE':
      default:
        return 'free';
    }
  }

  getBedIconClass(status: Bed['status'] | string | undefined): string {
    switch (this.normalizeBedStatus(status)) {
      case 'OCCUPIED':
        return 'icon-occupied';
      case 'RESERVED':
        return 'icon-reserved';
      case 'OUT_OF_SERVICE':
        return 'icon-out-of-service';
      case 'FREE':
      default:
        return 'icon-free';
    }
  }

  private normalizeBedStatus(
    status: Bed['status'] | string | undefined,
  ): string {
    return (status ?? '')
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }
}
