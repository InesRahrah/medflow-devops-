import { Component, OnInit } from '@angular/core';
import { NurseService, NurseRoom } from '../nurse.service';
import { TaskService, TaskResponse, TaskStatus } from '../../../core/services/task.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrl: './nurse-dashboard.component.css',
})
export class NurseDashboardComponent implements OnInit {
  rooms: NurseRoom[] = [];
  loading = true;
  error: string | null = null;
  nurseName = 'Nurse';
  fullGreeting = '';

  // Dashboard Stats
  stats = {
    assignedRooms: 0,
    patientsCount: 0,
    pendingTasks: 0,
    completedTasks: 0,
  };

  recentTasks: TaskResponse[] = [];

  constructor(
    private nurseService: NurseService,
    private taskService: TaskService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.nurseName = this.authService.getUserFirstName() || 'Nurse';
    this.fullGreeting = this.buildGreeting();
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;
    this.error = null;
    
    // Load Rooms
    this.nurseService.getMyRooms().subscribe({
      next: (data) => {
        this.rooms = data;
        this.calculateStats();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load assigned rooms.';
        this.loading = false;
      }
    });

    // Load Tasks for Stats & Preview
    this.taskService.getMyTasks().subscribe({
      next: (data) => {
        this.recentTasks = data.slice(0, 3);
        this.stats.pendingTasks = data.filter(t => t.status === TaskStatus.PENDING).length;
        this.stats.completedTasks = data.filter(t => t.status === TaskStatus.DONE).length;
      }
    });
  }

  private calculateStats(): void {
    this.stats.assignedRooms = this.rooms.length;
    this.stats.patientsCount = this.rooms.filter(
      (r) => r.status?.toLowerCase() === 'occupied',
    ).length;
  }

  getRoomStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#27ae60';
      case 'occupied':
        return '#e74c3c';
      case 'cleaning':
        return '#f97316';
      case 'maintenance':
        return '#f39c12';
      default:
        return '#95a5a6';
    }
  }

  capitalizeStatus(status: string): string {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  refresh(): void {
    this.loadRooms();
  }

  private buildGreeting(): string {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    return `${timeGreeting}, ${this.nurseName}`;
  }
}
