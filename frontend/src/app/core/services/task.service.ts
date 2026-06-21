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

export interface TaskRequest {
  title: string;
  description: string;
  assignedStaffId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  origin?: string;
  roomId?: string;
  patientId?: string;
  dueDate?: string;
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
export class TaskService {
  private readonly apiUrl = '/hospital-api/tasks';

  constructor(private http: HttpClient) {}

  createTask(request: TaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(this.apiUrl, request);
  }

  getMyTasks(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${this.apiUrl}/me`);
  }

  getAllTasks(): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(this.apiUrl);
  }

  getTasksByStaffId(staffId: string): Observable<TaskResponse[]> {
    return this.http.get<TaskResponse[]>(`${this.apiUrl}/staff/${staffId}`);
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(`${this.apiUrl}/${taskId}/status`, { status });
  }

  getTaskById(taskId: string): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${this.apiUrl}/${taskId}`);
  }
}
