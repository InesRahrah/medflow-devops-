import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NurseRoom {
  id: string;
  roomNumber: string;
  status: string;
  departmentName: string;
  floorName: string;
  capacity: number;
}

@Injectable({
  providedIn: 'root',
})
export class NurseService {
  private readonly apiUrl = '/hospital-api/staff/me/rooms';

  constructor(private http: HttpClient) {}

  getMyRooms(): Observable<NurseRoom[]> {
    return this.http.get<NurseRoom[]>(this.apiUrl);
  }
}
