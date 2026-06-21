import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface TaskResponse {
  id: string;
  title: string;
  description: string;
  assignedStaffId: string;
  staffName: string;
  status: TaskStatus;
  priority: TaskPriority;
  origin: string;
  roomId?: string;
  patientId?: string;
  createdAt: string;
  dueDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class NurseTaskService {
  private readonly apiUrl = '/hospital-api/tasks';

  constructor(private http: HttpClient) {}

  getMyTasks(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${this.apiUrl}/me`);
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.apiUrl}/${taskId}/status`, { status });
  }

  getTaskById(taskId: string): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.apiUrl}/${taskId}`);
  }
}
