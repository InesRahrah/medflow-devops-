export interface Floor {
  id: string; // Updated to String/UUID since backend uses UUID
  name: string;
  floorNumber: number;
  roomCount?: number;
  bedCount?: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  color?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  roomCount?: number;
  bedCount?: number;
  occupiedBedCount?: number;
  occupancyRate?: number;
}

export type RoomType = 'ICU' | 'WARD' | 'OR' | 'EMERGENCY' | 'Normal';

export interface RoomTypeConfig {
  maxBeds: number;
  label: string;
  description: string;
}

export const ROOM_TYPE_UNLIMITED_BEDS = -1;
export const DEFAULT_UNLIMITED_ROOM_CAPACITY = 50;

export const ROOM_TYPE_CONFIG: Record<RoomType, RoomTypeConfig> = {
  ICU: { maxBeds: 1, label: 'ICU', description: 'Intensive Care Unit (Max 1 bed)' },
  WARD: { maxBeds: ROOM_TYPE_UNLIMITED_BEDS, label: 'Ward', description: 'Multiple beds allowed' },
  OR: { maxBeds: 0, label: 'Operating Room', description: 'No beds allowed' },
  EMERGENCY: { maxBeds: 2, label: 'Emergency', description: 'Emergency unit (Max 2 beds)' },
  Normal: { maxBeds: 3, label: 'Normal Room', description: 'Standard room (Max 3 beds)' }
};

export function getRoomTypeMaxBeds(roomType?: RoomType): number {
  if (!roomType) return 0;
  return ROOM_TYPE_CONFIG[roomType]?.maxBeds ?? 0;
}

export function getRoomTypeCapacityForForm(roomType?: RoomType): number {
  const maxBeds = getRoomTypeMaxBeds(roomType);
  return maxBeds === ROOM_TYPE_UNLIMITED_BEDS
    ? DEFAULT_UNLIMITED_ROOM_CAPACITY
    : Math.max(maxBeds, 0);
}

export function normalizeRoomCapacity(
  roomType: RoomType | undefined,
  roomCapacity: number,
): number {
  const safeCapacity = Math.max(Math.trunc(roomCapacity || 0), 0);
  const typeMaxBeds = getRoomTypeMaxBeds(roomType);

  if (typeMaxBeds === ROOM_TYPE_UNLIMITED_BEDS) {
    return safeCapacity;
  }

  return Math.min(safeCapacity, Math.max(typeMaxBeds, 0));
}

export function normalizeRoomCapacityForSubmission(
  roomType: RoomType | undefined,
  roomCapacity: number,
): number {
  if (!roomType) {
    return Math.max(Math.trunc(roomCapacity || 0), 0);
  }

  if (roomType === 'OR') {
    return 0;
  }

  return Math.max(1, normalizeRoomCapacity(roomType, roomCapacity));
}

export function getRoomCapacityValidationError(
  roomType: RoomType | undefined,
  roomCapacity: number | undefined,
): string | null {
  if (!roomType) {
    return 'Room type is required.';
  }

  const numericCapacity = Number(roomCapacity);
  if (!Number.isFinite(numericCapacity)) {
    return 'Capacity is required.';
  }

  const normalizedCapacity = Math.max(Math.trunc(numericCapacity), 0);
  const typeMaxBeds = getRoomTypeMaxBeds(roomType);

  if (roomType === 'OR') {
    return normalizedCapacity === 0
      ? null
      : 'Operating rooms cannot contain beds.';
  }

  if (normalizedCapacity < 1) {
    return 'Capacity must be at least 1 for this room type.';
  }

  if (
    typeMaxBeds !== ROOM_TYPE_UNLIMITED_BEDS &&
    normalizedCapacity > typeMaxBeds
  ) {
    const roomTypeLabel = ROOM_TYPE_CONFIG[roomType]?.label || roomType;
    return `Maximum capacity for ${roomTypeLabel} is ${typeMaxBeds} beds.`;
  }

  return null;
}

export function getRoomHardCapacity(
  roomType: RoomType | undefined,
  roomCapacity?: number,
): number {
  const fallbackCapacity = getRoomTypeCapacityForForm(roomType);
  const sourceCapacity =
    typeof roomCapacity === 'number' ? roomCapacity : fallbackCapacity;
  return normalizeRoomCapacity(roomType, sourceCapacity);
}

export function getEffectiveRoomBedLimit(
  roomType: RoomType | undefined,
  roomCapacity?: number,
): number {
  const maxBeds = getRoomTypeMaxBeds(roomType);
  const typeLimit =
    maxBeds === ROOM_TYPE_UNLIMITED_BEDS
      ? Number.POSITIVE_INFINITY
      : Math.max(maxBeds, 0);
  const hardLimit = getRoomHardCapacity(roomType, roomCapacity);
  return Math.min(typeLimit, hardLimit);
}

export function isRoomAtBedLimit(
  roomType: RoomType | undefined,
  roomCapacity: number | undefined,
  currentBeds: number,
): boolean {
  const safeCurrentBeds = Math.max(currentBeds || 0, 0);
  return safeCurrentBeds >= getEffectiveRoomBedLimit(roomType, roomCapacity);
}
export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';

export interface Room {
  id: string;
  floorId: string;
  roomNumber: string;
  name?: string; // Keeping for UI compatibility check
  type: RoomType;
  status: RoomStatus;
  capacity: number;
  bedCount?: number; // Keeping for UI compatibility check
  departmentId: string;
  departmentName?: string; // For display
  assignedStaff?: any[]; // Using any[] to avoid circular dependency, will type in components
  responsibleStaffId?: string; // Kept for compatibility during transition
  responsibleStaffName?: string; // Kept for compatibility during transition
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export type BedStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
export type BedType = 'ICU' | 'STANDARD' | 'EMERGENCY';

export interface Bed {
  id: string;
  roomId: string; // Updated to String/UUID
  label: string;
  status: BedStatus;
  type?: BedType;
  notes?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}
