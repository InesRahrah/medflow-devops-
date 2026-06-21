import { Component, OnInit, HostListener } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import {
  Floor,
  Room,
  Bed,
  Department,
  ROOM_TYPE_CONFIG,
  RoomTypeConfig,
  getRoomCapacityValidationError,
  getRoomTypeCapacityForForm,
  normalizeRoomCapacityForSubmission,
  normalizeRoomCapacity,
} from '../../models/hospital-structure.model';
import { AuthService } from '../../../../core/services/auth.service';
import { HospitalStructureService } from '../../../../core/services/hospital-structure.service';

export interface RoomWithPositions extends Room {
  displayBeds: (Bed | null)[];
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
}

@Component({
  selector: 'app-floor-detail',
  templateUrl: './floor-detail.component.html',
  styleUrls: ['./floor-detail.component.css'],
})
export class FloorDetailComponent implements OnInit {
  floor: Floor | undefined;
  rooms: Room[] = [];
  allRooms: Room[] = [];
  roomsWithPositions: RoomWithPositions[] = [];
  floorId!: string;
  allFloors: Floor[] = [];
  showFloorDropdown = false;
  activeDepartmentId: string | null = null;
  activeDepartmentName: string = '';

  roomSearchTerm = '';
  roomStatusFilter: 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' = 'ALL';
  roomSortBy:
    | 'NUMBER_ASC'
    | 'NUMBER_DESC'
    | 'TYPE_ASC'
    | 'STATUS_ASC'
    | 'CAPACITY_DESC'
    | 'BEDS_DESC' = 'NUMBER_ASC';

  roomFilterOptions = [
    { label: 'All Rooms', value: 'ALL' },
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Occupied', value: 'OCCUPIED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
  ];

  roomSortOptions = [
    { label: 'Room Number (Asc)', value: 'NUMBER_ASC' },
    { label: 'Room Number (Desc)', value: 'NUMBER_DESC' },
    { label: 'Type (A-Z)', value: 'TYPE_ASC' },
    { label: 'Status (A-Z)', value: 'STATUS_ASC' },
    { label: 'Highest Capacity', value: 'CAPACITY_DESC' },
    { label: 'Most Beds', value: 'BEDS_DESC' },
  ];

  viewMode: 'grid' | 'blueprint' = 'grid';
  isEditMode: boolean = false;
  selectedRoomId: string | null = null;
  dragAction: 'move' | 'resize' | null = null;

  dragStartMouse = { x: 0, y: 0 };
  dragStartRoom = { x: 0, y: 0, w: 0, h: 0 };
  maxZ = 10;

  // Room CRUD State
  showRoomModal = false;
  showDeleteRoomModal = false;
  isRoomEditMode = false;
  currentRoom: Partial<Room> = {};
  roomToDelete: Room | null = null;
  roomModalErrorMessage = '';
  roomFormSubmitted = false;
  roomFieldErrors: Record<string, string> = {};

  roomTypes: any[] = [
    { label: 'Normal Room', value: 'Normal' },
    { label: 'ICU', value: 'ICU' },
    { label: 'Ward', value: 'WARD' },
    { label: 'Operating Room', value: 'OR' },
    { label: 'Emergency', value: 'EMERGENCY' },
  ];

  statusOptions: any[] = [
    { label: 'Available', value: 'AVAILABLE' },
    { label: 'Occupied', value: 'OCCUPIED' },
    { label: 'Maintenance', value: 'MAINTENANCE' },
  ];

  departmentOptions: any[] = [];
  departments: Department[] = [];
  pendingEditRoomId: string | null = null;
  isRoomModalClosing = false;
  private shouldOpenCreateRoomModal = false;

  get roomTypeConfig(): RoomTypeConfig | undefined {
    return this.currentRoom.type
      ? ROOM_TYPE_CONFIG[this.currentRoom.type]
      : undefined;
  }

  get maxAllowedCapacity(): number {
    return getRoomTypeCapacityForForm(this.currentRoom.type);
  }

  get showRoomCapacityLimitHint(): boolean {
    const config = this.roomTypeConfig;
    if (!config || config.maxBeds === -1) {
      return false;
    }

    const capacity = Number(this.currentRoom.capacity);
    if (!Number.isFinite(capacity)) {
      return false;
    }

    if (config.maxBeds === 0) {
      return capacity > 0;
    }

    return capacity >= config.maxBeds;
  }

  get displayedRooms(): Room[] {
    let filtered = [...this.rooms];

    const query = this.roomSearchTerm.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((room) =>
        room.roomNumber.toLowerCase().includes(query) ||
        room.type.toLowerCase().includes(query) ||
        room.status.toLowerCase().includes(query),
      );
    }

    if (this.roomStatusFilter !== 'ALL') {
      filtered = filtered.filter((room) => room.status === this.roomStatusFilter);
    }

    filtered.sort((a, b) => {
      switch (this.roomSortBy) {
        case 'NUMBER_DESC':
          return b.roomNumber.localeCompare(a.roomNumber, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        case 'TYPE_ASC':
          return a.type.localeCompare(b.type);
        case 'STATUS_ASC':
          return a.status.localeCompare(b.status);
        case 'CAPACITY_DESC':
          return Math.max(b.capacity || 0, 0) - Math.max(a.capacity || 0, 0);
        case 'BEDS_DESC':
          return Math.max(b.bedCount || 0, 0) - Math.max(a.bedCount || 0, 0);
        case 'NUMBER_ASC':
        default:
          return a.roomNumber.localeCompare(b.roomNumber, undefined, {
            numeric: true,
            sensitivity: 'base',
          });
      }
    });

    return filtered;
  }

  onRoomTypeChange(): void {
    const roomType = this.currentRoom.type;
    if (!roomType) {
      return;
    }

    if (roomType === 'OR') {
      this.currentRoom.capacity = 0;
    } else {
      const fallbackCapacity = getRoomTypeCapacityForForm(roomType);
      const nextCapacity =
        typeof this.currentRoom.capacity === 'number'
          ? this.currentRoom.capacity
          : fallbackCapacity;
      this.currentRoom.capacity = normalizeRoomCapacityForSubmission(
        roomType,
        nextCapacity,
      );
    }

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private hospitalService: HospitalStructureService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.floorId = params.get('floorId') as string;
      this.loadFloorData();
      this.loadDepartments();
    });

    this.route.queryParamMap.subscribe((params) => {
      this.activeDepartmentId = params.get('departmentId');
      this.activeDepartmentName = params.get('departmentName') || '';
      this.pendingEditRoomId = params.get('editRoomId');
      this.shouldOpenCreateRoomModal = params.get('create') === 'room';
      this.loadFloorData();

      if (this.shouldOpenCreateRoomModal) {
        this.openAddRoomModal();
        this.shouldOpenCreateRoomModal = false;
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { create: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });
  }

  loadDepartments(): void {
    this.hospitalService.getMyDepartments().subscribe((deps) => {
      this.departments = deps;
      this.departmentOptions = deps.map((d) => ({
        label: d.name,
        value: d.id,
      }));
    });
  }

  loadFloorData(): void {
    this.hospitalService.getAllFloors().subscribe((floors) => {
      this.allFloors = floors;
      this.floor = floors.find((f) => f.id === this.floorId);
    });

    this.hospitalService.getRoomsByFloor(this.floorId).subscribe((rooms) => {
      this.allRooms = rooms;
      this.rooms = this.activeDepartmentId
        ? rooms.filter((room) => room.departmentId === this.activeDepartmentId)
        : rooms;

      this.tryOpenRoomEditFromQuery();

      if (this.rooms.length === 0) {
        this.roomsWithPositions = [];
        return;
      }

      const bedRequests = this.rooms.map((room) =>
        this.hospitalService
          .getBedsByRoom(room.id)
          .pipe(catchError(() => of([] as Bed[]))),
      );

      forkJoin(bedRequests).subscribe((bedsByRoom) => {
        let currentX = 40;
        let currentY = 40;
        let maxHeight = 0;

        this.roomsWithPositions = this.rooms.map((room, idx) => {
          let w = room.width || 180;
          let h = room.height || 140;
          if (!room.width || !room.height) {
            if (room.type === 'OR') w = 240;
            if (room.type === 'ICU') {
              w = 300;
              h = 160;
            }
          }

          const roomBeds = bedsByRoom[idx] || [];
          const capacity = Math.max(room.capacity || 0, 0);
          const displayBeds = Array.from(
            { length: capacity },
            (_, i) => roomBeds[i] || null,
          );

          let rx = room.x;
          let ry = room.y;
          if (rx == null || ry == null) {
            rx = currentX;
            ry = currentY;
            if (currentX + w > 1000) {
              rx = 40;
              currentX = 40;
              ry += maxHeight + 40;
              currentY = ry;
              maxHeight = 0;
            }
            currentX += w + 20;
            if (h > maxHeight) maxHeight = h;
          }

          return {
            ...room,
            displayBeds,
            x: rx,
            y: ry,
            width: w,
            height: h,
            z: 1,
          };
        });
      });
    });
  }

  toggleFloorDropdown(): void {
    this.showFloorDropdown = !this.showFloorDropdown;
  }

  switchFloor(floorId: string): void {
    this.showFloorDropdown = false;
    this.router.navigate(['/hospital/hospital-structure/floor', floorId]);
  }

  setMode(mode: 'grid' | 'blueprint-view' | 'blueprint-edit'): void {
    if (mode === 'grid') {
      this.viewMode = 'grid';
      this.isEditMode = false;
      this.selectedRoomId = null;
    } else if (mode === 'blueprint-view') {
      this.viewMode = 'blueprint';
      this.isEditMode = false;
      this.selectedRoomId = null;
    } else if (mode === 'blueprint-edit') {
      this.viewMode = 'blueprint';
      this.isEditMode = true;
    }
  }

  onRoomInteract(
    event: MouseEvent,
    room: RoomWithPositions,
    action: 'move' | 'resize',
  ): void {
    if (!this.isEditMode) {
      if (action === 'move') {
        this.onRoomClick(room);
      }
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    this.selectedRoomId = room.id;
    room.z = ++this.maxZ;

    this.dragAction = action;
    this.dragStartMouse = { x: event.clientX, y: event.clientY };
    this.dragStartRoom = {
      x: room.x,
      y: room.y,
      w: room.width,
      h: room.height,
    };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragAction || !this.selectedRoomId) return;

    const room = this.roomsWithPositions.find(
      (r) => r.id === this.selectedRoomId,
    );
    if (!room) return;

    const dx = event.clientX - this.dragStartMouse.x;
    const dy = event.clientY - this.dragStartMouse.y;
    const SNAP = 20;

    if (this.dragAction === 'move') {
      let nx = Math.round((this.dragStartRoom.x + dx) / SNAP) * SNAP;
      let ny = Math.round((this.dragStartRoom.y + dy) / SNAP) * SNAP;
      room.x = Math.max(0, nx);
      room.y = Math.max(0, ny);
    } else if (this.dragAction === 'resize') {
      let nw = Math.round((this.dragStartRoom.w + dx) / SNAP) * SNAP;
      let nh = Math.round((this.dragStartRoom.h + dy) / SNAP) * SNAP;
      room.width = Math.max(120, nw);
      room.height = Math.max(100, nh);
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.dragAction || !this.selectedRoomId) return;

    const room = this.roomsWithPositions.find(
      (r) => r.id === this.selectedRoomId,
    );
    if (room) {
      const roomPayload: Partial<Room> = {
        roomNumber: room.roomNumber,
        type: room.type,
        status: room.status,
        floorId: this.floorId,
        capacity: normalizeRoomCapacity(room.type, room.capacity || 0),
        departmentId: room.departmentId,
        x: room.x,
        y: room.y,
        width: room.width,
        height: room.height,
      };

      this.hospitalService.updateRoom(room.id, roomPayload).subscribe();
    }
    this.dragAction = null;
  }

  openAddRoomModal(): void {
    this.isRoomEditMode = false;
    this.roomModalErrorMessage = '';
    this.roomFormSubmitted = false;
    this.roomFieldErrors = {};

    // Calculate intelligent offset to prevent overlapping
    const count = this.rooms.length;
    const gridCols = 3;
    const spacingX = 220;
    const spacingY = 180;
    const offsetX = 40 + (count % gridCols) * spacingX;
    const offsetY = 40 + Math.floor(count / gridCols) * spacingY;

    this.currentRoom = {
      roomNumber: `${this.rooms.length + 101}`,
      floorId: this.floorId,
      type: 'Normal',
      status: 'AVAILABLE',
      capacity: 1,
      departmentId: this.activeDepartmentId || (this.departments.length > 0 ? this.departments[0].id : ''),
      x: offsetX,
      y: offsetY,
      width: 180,
      height: 140,
    };
    this.onRoomTypeChange();
    this.showRoomModal = true;
  }

  openEditRoomModal(room: Room, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isRoomEditMode = true;
    this.roomModalErrorMessage = '';
    this.roomFormSubmitted = false;
    this.roomFieldErrors = {};
    this.currentRoom = { ...room };
    this.onRoomTypeChange();
    this.showRoomModal = true;
  }

  private tryOpenRoomEditFromQuery(): void {
    if (!this.pendingEditRoomId || this.showRoomModal) return;

    const targetRoom = this.allRooms.find((room) => room.id === this.pendingEditRoomId);
    if (!targetRoom) return;

    this.openEditRoomModal(targetRoom);
    this.pendingEditRoomId = null;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editRoomId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  closeRoomModal(): void {
    // Prevent multiple close calls during animation
    if (this.isRoomModalClosing) {
      return;
    }

    this.isRoomModalClosing = true;
    // Wait for closing animation to complete before hiding
    setTimeout(() => {
      this.showRoomModal = false;
      this.isRoomModalClosing = false;
      this.currentRoom = {};
      this.roomModalErrorMessage = '';
      this.roomFormSubmitted = false;
      this.roomFieldErrors = {};
    }, 300); // Match the animation duration (0.3s = 300ms)
  }

  confirmRoomAction(): void {
    this.roomFormSubmitted = true;
    this.roomFieldErrors = {};
    this.roomModalErrorMessage = '';

    const clientErrors = this.getRoomClientErrors();
    if (Object.keys(clientErrors).length > 0) {
      this.roomFieldErrors = clientErrors;
      return;
    }

    const normalizedRoomNumber = (this.currentRoom.roomNumber || '').trim();

    const roomPayload: Partial<Room> = {
      roomNumber: normalizedRoomNumber,
      type: this.currentRoom.type as any,
      status: this.currentRoom.status || 'AVAILABLE',
      floorId: this.floorId,
      capacity: normalizeRoomCapacityForSubmission(
        this.currentRoom.type,
        typeof this.currentRoom.capacity === 'number'
          ? this.currentRoom.capacity
          : getRoomTypeCapacityForForm(this.currentRoom.type),
      ),
      departmentId: this.currentRoom.departmentId,
      x: this.currentRoom.x,
      y: this.currentRoom.y,
      width: this.currentRoom.width,
      height: this.currentRoom.height,
    };

    if (this.isRoomEditMode && this.currentRoom.id) {
      this.hospitalService
        .updateRoom(this.currentRoom.id, roomPayload)
        .subscribe(
          () => {
            this.loadFloorData();
            this.closeRoomModal();
          },
          (error) => {
            console.error('Update room failed:', error);
            if (!this.applyRoomBackendFieldErrors(error)) {
              this.roomModalErrorMessage = this.authService.getFriendlyErrorMessage(
                error,
                'Failed to update room.',
              );
            }
          },
        );
    } else {
      this.hospitalService.createRoom(roomPayload).subscribe(
        () => {
          this.loadFloorData();
          this.closeRoomModal();
        },
        (error) => {
          console.error('Create room failed:', error);
          if (!this.applyRoomBackendFieldErrors(error)) {
            this.roomModalErrorMessage = this.authService.getFriendlyErrorMessage(
              error,
              'Failed to create room.',
            );
          }
        },
      );
    }
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

  private applyRoomBackendFieldErrors(error: any): boolean {
    const backendErrors = error?.error?.errors as Record<string, string> | undefined;
    if (!backendErrors) {
      return false;
    }

    const mapped: Record<string, string> = {};
    const supportedFields = ['roomNumber', 'type', 'departmentId', 'status', 'capacity'] as const;
    supportedFields.forEach((field) => {
      if (backendErrors[field]) {
        mapped[field] = backendErrors[field];
      }
    });

    this.roomFieldErrors = mapped;
    return Object.keys(mapped).length > 0;
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
      if (field === 'roomNumber') return 'Room number is required.';
      if (field === 'type') return 'Room type is required.';
      if (field === 'departmentId') return 'Department is required.';
      if (field === 'status') return 'Room status is required.';
      if (field === 'capacity') return 'Capacity is required.';
      return 'This field is required.';
    }

    if (model.errors['minlength']) {
      if (field === 'roomNumber') return 'Room number must be at least 2 characters.';
      return 'Value is too short.';
    }

    if (model.errors['maxlength']) {
      if (field === 'roomNumber') return 'Room number must be at most 30 characters.';
      return 'Value is too long.';
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

  deleteRoom(room: Room, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.roomToDelete = room;
    this.showDeleteRoomModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteRoomModal = false;
    this.roomToDelete = null;
  }

  confirmDeleteRoom(): void {
    if (this.roomToDelete) {
      this.hospitalService.deleteRoom(this.roomToDelete.id).subscribe(() => {
        this.loadFloorData();
        this.closeDeleteModal();
        if (this.selectedRoomId === this.roomToDelete?.id) {
          this.selectedRoomId = null;
        }
      });
    }
  }

  addRoom(): void {
    this.openAddRoomModal();
  }

  onWorkspaceClick(): void {
    if (this.isEditMode) {
      this.selectedRoomId = null;
    }
  }

  onRoomClick(room: Room): void {
    const queryParams = this.activeDepartmentId
      ? {
          departmentId: this.activeDepartmentId,
          departmentName: this.activeDepartmentName,
        }
      : undefined;

    this.router.navigate(
      ['/hospital/hospital-structure/floor', this.floorId, 'room', room.id],
      { queryParams },
    );
  }

  goBack(): void {
    this.router.navigate(['/hospital/hospital-structure']);
  }

  clearDepartmentFilter(): void {
    this.router.navigate(['/hospital/hospital-structure/floor', this.floorId]);
  }

  clearRoomGridFilters(): void {
    this.roomSearchTerm = '';
    this.roomStatusFilter = 'ALL';
    this.roomSortBy = 'NUMBER_ASC';
  }
}
