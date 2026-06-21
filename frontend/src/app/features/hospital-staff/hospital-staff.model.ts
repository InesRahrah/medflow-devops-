export type StaffRole = 'DOCTOR' | 'NURSE' | 'STAFF_ADMIN';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
export type StaffStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface StaffMember {
  id: string;
  userId: string;
  email?: string;
  firstName: string;
  lastName: string;
  hospitalId: string;
  departmentId?: string;
  role: StaffRole;
  employmentType: EmploymentType;
  status: StaffStatus;
  assignedRoomCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignedRoom {
  roomId: string;
  roomNumber: string;
  roomStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  floorId?: string;
  floorName?: string;
  departmentId?: string;
  departmentName?: string;
}

export interface StaffDetailResponse {
  staff: StaffMember;
  assignedRooms: AssignedRoom[];
  assignedRoomCount: number;
  activitySummary: string;
}

export interface AdminCreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  departmentId?: string;
  role: StaffRole;
  employmentType: EmploymentType;
  status: StaffStatus;
}

export interface StaffUpdateRequest {
  userId: string;
  email?: string;
  firstName: string;
  lastName: string;
  departmentId?: string;
  role: StaffRole;
  employmentType: EmploymentType;
  status: StaffStatus;
}

export interface StaffRoomAssignmentRequest {
  roomIds: string[];
}

export interface AdminCreateStaffResponse {
  staff: StaffMember;
  passwordGenerated: boolean;
  generatedPassword?: string;
}
