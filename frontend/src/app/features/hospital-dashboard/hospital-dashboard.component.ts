import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { HospitalStaffService } from '../../core/services/hospital-staff.service';
import { HospitalStructureService } from '../../core/services/hospital-structure.service';
import { TaskService, TaskPriority, TaskStatus, TaskResponse } from '../../core/services/task.service';
import {
  Bed,
  Department,
  Floor,
  Room,
} from '../hospital-structure/models/hospital-structure.model';
import { StaffMember } from '../hospital-staff/hospital-staff.model';

type RoomBedSummary = {
  roomId: string;
  totalBeds: number;
  occupiedBeds: number;
};

type DepartmentInsight = {
  id: string;
  name: string;
  color: string;
  roomCount: number;
  bedCount: number;
  occupiedBedCount: number;
  occupancyRate: number;
};
type FloorOccupancyInsight = {
  id: string;
  floorName: string;
  floorNumber: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
};

type StaffWorkload = {
  staffId: string;
  staffName: string;
  role: string;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  workloadPercentage: number;
};

@Component({
  selector: 'app-hospital-dashboard',
  templateUrl: './hospital-dashboard.component.html',
  styleUrls: ['./hospital-dashboard.component.css']
})
export class HospitalDashboardComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  floors: Floor[] = [];
  rooms: Room[] = [];
  departments: Department[] = [];
  staffMembers: StaffMember[] = [];

  totalFloors = 0;
  totalRooms = 0;
  totalBeds = 0;
  occupiedBeds = 0;
  availableBeds = 0;

  departmentInsights: DepartmentInsight[] = [];
  floorOccupancyInsights: FloorOccupancyInsight[] = [];
  staffWorkloads: StaffWorkload[] = [];
  private allTasks: TaskResponse[] = [];

  // Task Assignment Modal
  showTaskModal = false;
  taskSuccess = '';
  
  // Staff Tasks View Modal
  showStaffTasksModal = false;
  selectedStaffForTasks: { id: string, name: string } | null = null;
  selectedStaffTasks: TaskResponse[] = [];
  
  constructor(
    private router: Router,
    private authService: AuthService,
    private hospitalStructureService: HospitalStructureService,
    private hospitalStaffService: HospitalStaffService,
    private taskService: TaskService
  ) {}

  navigateToCreate(action: 'floor' | 'room' | 'department' | 'staff' | 'manage-structure' | 'view-departments'): void {
    if (action === 'manage-structure') {
      this.router.navigate(['/hospital/hospital-structure']);
      return;
    }

    if (action === 'view-departments') {
      this.router.navigate(['/hospital/departments']);
      return;
    }

    if (action === 'floor') {
      this.router.navigate(['/hospital/hospital-structure'], { queryParams: { create: 'floor' } });
      return;
    }

    if (action === 'room') {
      this.router.navigate(['/hospital/hospital-structure'], { queryParams: { create: 'room' } });
      return;
    }

    if (action === 'department') {
      this.router.navigate(['/hospital/departments'], { queryParams: { create: 'department' } });
      return;
    }

    if (action === 'staff') {
      this.router.navigate(['/hospital/staff'], { queryParams: { create: 'staff' } });
      return;
    }
  }

  openTaskModal(): void {
    this.showTaskModal = true;
    this.taskSuccess = '';
  }

  onTaskAssigned(): void {
    this.showTaskModal = false;
    this.taskSuccess = 'Task assigned successfully!';
    setTimeout(() => this.taskSuccess = '', 4000); // clear toast after 4s
    this.loadDashboardData(); // Refresh workloads after assignment
  }

  viewStaffTasks(staffId: string, staffName: string): void {
    this.selectedStaffForTasks = { id: staffId, name: staffName };
    this.selectedStaffTasks = this.allTasks.filter(t => t.assignedStaffId === staffId);
    this.showStaffTasksModal = true;
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  get totalDepartments(): number {
    return this.departments.length;
  }

  get totalStaff(): number {
    return this.staffMembers.length;
  }

  get occupancyRate(): number {
    if (!this.totalBeds) {
      return 0;
    }
    return Math.round((this.occupiedBeds / this.totalBeds) * 100);
  }

  get activeDepartments(): number {
    return this.departments.filter((department) => (department.status || 'ACTIVE') === 'ACTIVE').length;
  }

  get activeStaff(): number {
    return this.staffMembers.filter((staff) => staff.status === 'ACTIVE').length;
  }

  get staffCoverageRate(): number {
    if (!this.totalStaff) {
      return 0;
    }
    return Math.round((this.activeStaff / this.totalStaff) * 100);
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      floors: this.hospitalStructureService.getAllFloors(),
      rooms: this.hospitalStructureService.getMyRooms(),
      departments: this.hospitalStructureService.getMyDepartments(),
      staff: this.hospitalStaffService.getMyStaff(),
      tasks: this.taskService.getAllTasks().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ floors, rooms, departments, staff, tasks }) => {
        this.floors = (floors || []).slice().sort((a, b) => a.floorNumber - b.floorNumber);
        this.rooms = rooms || [];
        this.departments = departments || [];
        this.staffMembers = staff || [];
        this.allTasks = tasks || [];

        this.totalFloors = this.floors.length;
        this.totalRooms = this.rooms.length;

        this.calculateStaffWorkloads(this.staffMembers, this.allTasks);
        this.loadBedAnalytics();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.authService.getFriendlyErrorMessage(
          err,
          'Unable to load dashboard data.',
        );
      },
    });
  }

  private calculateStaffWorkloads(staff: StaffMember[], tasks: any[]): void {
    // Show active staff members in the workload dashboard
    const activeStaff = staff.filter(s => s.status === 'ACTIVE');
    
    this.staffWorkloads = activeStaff.map(member => {
      const staffTasks = tasks.filter(t => t.assignedStaffId === member.id);
      const total = staffTasks.length;
      const pending = staffTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
      const completed = staffTasks.filter(t => t.status === 'DONE').length;
      
      // Calculate workload based on role capacity
      const capacity = this.getCapacityByRole(member.role);
      let workloadPercentage = 0;
      
      if (capacity > 0) {
        workloadPercentage = Math.min(Math.round((pending / capacity) * 100), 100);
      }

      return {
        staffId: member.id,
        staffName: `${member.firstName} ${member.lastName}`,
        role: member.role,
        totalTasks: total,
        pendingTasks: pending,
        completedTasks: completed,
        workloadPercentage
      };
    }).sort((a, b) => b.pendingTasks - a.pendingTasks); // Sort by highest workload first
  }

  private getCapacityByRole(role: string): number {
    switch (role.toUpperCase()) {
      case 'NURSE':
        return 10;
      case 'DOCTOR':
        return 7;
      case 'STAFF_ADMIN':
        return 0; // Admins don't have a task-based workload capacity
      default:
        return 5; // Default fallback for unknown roles
    }
  }

  private loadBedAnalytics(): void {
    if (!this.rooms.length) {
      this.processAnalytics([]);
      return;
    }

    const bedRequests = this.rooms.map((room) =>
      this.hospitalStructureService.getBedsByRoom(room.id).pipe(
        map((beds: Bed[]) => ({
          roomId: room.id,
          totalBeds: beds.length,
          occupiedBeds: beds.filter((bed) => this.isOccupiedBed(bed)).length,
        })),
        catchError(() =>
          of({
            roomId: room.id,
            totalBeds: Math.max(room.bedCount || 0, 0),
            occupiedBeds: 0,
          }),
        ),
      ),
    );

    forkJoin(bedRequests).subscribe({
      next: (roomBedSummaries) => {
        this.processAnalytics(roomBedSummaries);
      },
      error: () => {
        this.processAnalytics([]);
      },
    });
  }

  private processAnalytics(roomBedSummaries: RoomBedSummary[]): void {
    const bedStatsByRoom = roomBedSummaries.reduce<Record<string, RoomBedSummary>>((acc, summary) => {
      acc[summary.roomId] = summary;
      return acc;
    }, {});

    const computedTotalBeds = this.rooms.reduce((total, room) => {
      const summary = bedStatsByRoom[room.id];
      if (summary) {
        return total + Math.max(summary.totalBeds, 0);
      }
      return total + Math.max(room.bedCount || 0, 0);
    }, 0);

    const computedOccupiedBeds = this.rooms.reduce((total, room) => {
      const summary = bedStatsByRoom[room.id];
      if (summary) {
        return total + Math.max(summary.occupiedBeds, 0);
      }
      return total;
    }, 0);

    this.totalBeds = computedTotalBeds;
    this.occupiedBeds = Math.min(computedOccupiedBeds, this.totalBeds);
    this.availableBeds = Math.max(this.totalBeds - this.occupiedBeds, 0);

    this.departmentInsights = this.departments
      .map((department) => {
        const departmentRooms = this.rooms.filter((room) => room.departmentId === department.id);
        const roomCount = Math.max(department.roomCount || 0, departmentRooms.length);

        const derivedBeds = departmentRooms.reduce((total, room) => {
          const summary = bedStatsByRoom[room.id];
          if (summary) {
            return total + Math.max(summary.totalBeds, 0);
          }
          return total + Math.max(room.bedCount || 0, 0);
        }, 0);

        const derivedOccupied = departmentRooms.reduce((total, room) => {
          const summary = bedStatsByRoom[room.id];
          return total + Math.max(summary?.occupiedBeds || 0, 0);
        }, 0);

        const bedCount = Math.max(department.bedCount || 0, derivedBeds);
        const occupiedBedCount = Math.min(
          Math.max(department.occupiedBedCount || 0, derivedOccupied),
          bedCount,
        );

        return {
          id: department.id,
          name: department.name,
          color: department.color || '#0092DF',
          roomCount,
          bedCount,
          occupiedBedCount,
          occupancyRate: bedCount ? Math.round((occupiedBedCount / bedCount) * 100) : 0,
        };
      })
      .sort((a, b) => b.bedCount - a.bedCount)
      .slice(0, 6);

    this.floorOccupancyInsights = this.floors
      .map((floor) => {
        const floorRooms = this.rooms.filter((room) => room.floorId === floor.id);
        const floorTotalBeds = floorRooms.reduce((total, room) => {
          const summary = bedStatsByRoom[room.id];
          if (summary) {
            return total + Math.max(summary.totalBeds, 0);
          }
          return total + Math.max(room.bedCount || 0, 0);
        }, 0);

        const floorOccupiedBeds = floorRooms.reduce((total, room) => {
          const summary = bedStatsByRoom[room.id];
          return total + Math.max(summary?.occupiedBeds || 0, 0);
        }, 0);

        const totalBeds = Math.max(floorTotalBeds, 0);
        const occupiedBeds = Math.min(Math.max(floorOccupiedBeds, 0), totalBeds);

        return {
          id: floor.id,
          floorName: floor.name,
          floorNumber: floor.floorNumber,
          totalBeds,
          occupiedBeds,
          availableBeds: Math.max(totalBeds - occupiedBeds, 0),
          occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        };
      })
      .sort((a, b) => a.floorNumber - b.floorNumber);

    this.isLoading = false;
  }

  private isOccupiedBed(bed: Bed): boolean {
    return bed.status === 'OCCUPIED' || bed.status === 'RESERVED';
  }
}
