import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Floor, Room, Bed, Department } from '../../features/hospital-structure/models/hospital-structure.model';

export interface DepartmentDeleteActionPayload {
  action: 'DELETE_CASCADE' | 'REASSIGN_AND_DELETE';
  targetDepartmentId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HospitalStructureService {
  private apiUrl = '/hospital-api';

  constructor(private http: HttpClient) {}

  // Floors
  getAllFloors(): Observable<Floor[]> {
    return this.http.get<Floor[]>(`${this.apiUrl}/floors/me`);
  }

  createFloor(floor: Partial<Floor>): Observable<Floor> {
    return this.http.post<Floor>(`${this.apiUrl}/floors`, floor);
  }

  updateFloor(id: string, floor: Partial<Floor>): Observable<Floor> {
    return this.http.put<Floor>(`${this.apiUrl}/floors/${id}`, floor);
  }

  deleteFloor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/floors/${id}`);
  }

  // Rooms
  getMyRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms/me`);
  }

  getRoomsByFloor(floorId: string): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/rooms/floor/${floorId}`);
  }

  createRoom(room: Partial<Room>): Observable<Room> {
    return this.http.post<Room>(`${this.apiUrl}/rooms`, room);
  }

  updateRoom(id: string, room: Partial<Room>): Observable<Room> {
    return this.http.put<Room>(`${this.apiUrl}/rooms/${id}`, room);
  }

  deleteRoom(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/rooms/${id}`);
  }

  // Beds
  getBedsByRoom(roomId: string): Observable<Bed[]> {
    return this.http.get<Bed[]>(`${this.apiUrl}/beds/room/${roomId}`);
  }

  createBed(bed: Partial<Bed>): Observable<Bed> {
    return this.http.post<Bed>(`${this.apiUrl}/beds`, bed);
  }

  updateBed(id: string, bed: Partial<Bed>): Observable<Bed> {
    return this.http.put<Bed>(`${this.apiUrl}/beds/${id}`, bed);
  }

  deleteBed(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/beds/${id}`);
  }

  // Departments
  getMyDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${this.apiUrl}/departments/me`);
  }

  createDepartment(department: Partial<Department>): Observable<Department> {
    return this.http.post<Department>(`${this.apiUrl}/departments`, department);
  }

  updateDepartment(id: string, department: Partial<Department>): Observable<Department> {
    return this.http.put<Department>(`${this.apiUrl}/departments/${id}`, department);
  }

  deleteDepartment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/departments/${id}`);
  }

  deleteDepartmentWithAction(id: string, payload: DepartmentDeleteActionPayload): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/departments/${id}/delete-action`, payload);
  }
}
