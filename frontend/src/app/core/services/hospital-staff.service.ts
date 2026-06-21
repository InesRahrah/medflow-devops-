import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import {
  AdminCreateStaffRequest,
  AdminCreateStaffResponse,
  StaffMember,
  StaffDetailResponse,
  StaffRoomAssignmentRequest,
  StaffUpdateRequest,
} from '../../features/hospital-staff/hospital-staff.model';
import { Room } from '../../features/hospital-structure/models/hospital-structure.model';

@Injectable({
  providedIn: 'root',
})
export class HospitalStaffService {
  private readonly apiUrl = '/hospital-api/staff';

  constructor(private http: HttpClient) {}

  getMyStaff(): Observable<StaffMember[]> {
    return this.http.get<unknown>(`${this.apiUrl}/me`).pipe(
      tap((response) => console.log('getMyStaff API response:', response)),
      map((response) =>
        this.extractStaffList(response).map((item) => this.normalizeStaffMember(item)),
      ),
      tap((normalized) => console.log('getMyStaff normalized:', normalized)),
    );
  }

  getStaffById(staffId: string): Observable<StaffMember> {
    return this.http
      .get<unknown>(`${this.apiUrl}/${staffId}`)
      .pipe(map((response) => this.normalizeStaffMember(response)));
  }

  getStaffDetail(staffId: string): Observable<StaffDetailResponse> {
    return this.http
      .get<unknown>(`${this.apiUrl}/${staffId}/detail`)
      .pipe(map((response) => this.normalizeStaffDetail(response)));
  }

  createStaffByAdmin(payload: AdminCreateStaffRequest): Observable<AdminCreateStaffResponse> {
    return this.http.post<unknown>(`${this.apiUrl}/admin/create`, payload).pipe(
      tap((response) => console.log('API response:', response)),
      map((response) => this.normalizeCreateStaffResponse(response)),
    );
  }

  updateStaff(staffId: string, payload: StaffUpdateRequest): Observable<StaffMember> {
    return this.http
      .put<unknown>(`${this.apiUrl}/${staffId}`, payload)
      .pipe(map((response) => this.normalizeStaffMember(response)));
  }

  deleteStaff(staffId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${staffId}`);
  }

  assignRooms(staffId: string, payload: StaffRoomAssignmentRequest): Observable<Room[]> {
    return this.http.put<Room[]>(`${this.apiUrl}/${staffId}/assignments/rooms`, payload);
  }

  private normalizeCreateStaffResponse(response: unknown): AdminCreateStaffResponse {
    const root = this.unwrapResponseObject(response);
    const staffSource =
      this.unwrapResponseObject((root as { staff?: unknown }).staff) || root;

    return {
      staff: this.normalizeStaffMember(staffSource),
      passwordGenerated: Boolean((root as { passwordGenerated?: unknown }).passwordGenerated),
      generatedPassword: this.toOptionalString(
        (root as { generatedPassword?: unknown }).generatedPassword,
      ),
    };
  }

  private normalizeStaffDetail(response: unknown): StaffDetailResponse {
    const root = this.unwrapResponseObject(response);
    const staff = this.normalizeStaffMember((root as { staff?: unknown }).staff);
    const assignedRoomsRaw = (root as { assignedRooms?: unknown }).assignedRooms;

    return {
      staff,
      assignedRooms: Array.isArray(assignedRoomsRaw)
        ? (assignedRoomsRaw as StaffDetailResponse['assignedRooms'])
        : [],
      assignedRoomCount:
        typeof (root as { assignedRoomCount?: unknown }).assignedRoomCount === 'number'
          ? ((root as { assignedRoomCount: number }).assignedRoomCount as number)
          : 0,
      activitySummary: this.toStringValue(
        (root as { activitySummary?: unknown }).activitySummary,
      ),
    };
  }

  private extractStaffList(response: unknown): unknown[] {
    const root = this.unwrapResponseObject(response);
    if (Array.isArray(root)) {
      return root;
    }

    const staff = (root as { staff?: unknown }).staff;
    if (Array.isArray(staff)) {
      return staff;
    }

    const content = (root as { content?: unknown }).content;
    if (Array.isArray(content)) {
      return content;
    }

    return [];
  }

  private normalizeStaffMember(response: unknown): StaffMember {
    const root = this.unwrapResponseObject(response);
    const user = this.unwrapResponseObject((root as { user?: unknown }).user);

    return {
      id: this.toStringValue((root as { id?: unknown; staffId?: unknown }).id ?? (root as { staffId?: unknown }).staffId),
      userId: this.toStringValue(
        (root as { userId?: unknown; user_id?: unknown }).userId ??
          (root as { user_id?: unknown }).user_id ??
          (user as { id?: unknown; userId?: unknown }).id ??
          (user as { userId?: unknown }).userId,
      ),
      email: this.toOptionalString(
        (root as { email?: unknown }).email ??
          (user as { email?: unknown }).email,
      ),
      firstName: this.toStringValue(
        (root as { firstName?: unknown; first_name?: unknown }).firstName ??
          (root as { first_name?: unknown }).first_name ??
          (user as { firstName?: unknown; first_name?: unknown }).firstName ??
          (user as { first_name?: unknown }).first_name,
      ),
      lastName: this.toStringValue(
        (root as { lastName?: unknown; last_name?: unknown }).lastName ??
          (root as { last_name?: unknown }).last_name ??
          (user as { lastName?: unknown; last_name?: unknown }).lastName ??
          (user as { last_name?: unknown }).last_name,
      ),
      hospitalId: this.toStringValue(
        (root as { hospitalId?: unknown; hospital_id?: unknown }).hospitalId ??
          (root as { hospital_id?: unknown }).hospital_id,
      ),
      departmentId: this.toOptionalString(
        (root as { departmentId?: unknown; department_id?: unknown }).departmentId ??
          (root as { department_id?: unknown }).department_id,
      ),
      role: this.toStringValue((root as { role?: unknown }).role) as StaffMember['role'],
      employmentType: this.toStringValue(
        (root as { employmentType?: unknown; employment_type?: unknown }).employmentType ??
          (root as { employment_type?: unknown }).employment_type,
      ) as StaffMember['employmentType'],
      status: this.toStringValue((root as { status?: unknown }).status) as StaffMember['status'],
      assignedRoomCount:
        typeof (root as { assignedRoomCount?: unknown }).assignedRoomCount === 'number'
          ? ((root as { assignedRoomCount: number }).assignedRoomCount as number)
          : 0,
      createdAt: this.toStringValue(
        (root as { createdAt?: unknown; created_at?: unknown }).createdAt ??
          (root as { created_at?: unknown }).created_at,
      ),
      updatedAt: this.toStringValue(
        (root as { updatedAt?: unknown; updated_at?: unknown }).updatedAt ??
          (root as { updated_at?: unknown }).updated_at,
      ),
    };
  }

  private unwrapResponseObject(response: unknown): Record<string, unknown> | unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (!response || typeof response !== 'object') {
      return {};
    }

    const objectResponse = response as Record<string, unknown>;
    if (objectResponse['data'] && typeof objectResponse['data'] === 'object') {
      return objectResponse['data'] as Record<string, unknown>;
    }

    return objectResponse;
  }

  private toStringValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return String(value);
  }
}
