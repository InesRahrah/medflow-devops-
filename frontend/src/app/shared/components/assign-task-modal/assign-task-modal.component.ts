import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { HospitalStaffService } from '../../../core/services/hospital-staff.service';
import { TaskService, TaskPriority, TaskStatus } from '../../../core/services/task.service';
import { StaffMember } from '../../../features/hospital-staff/hospital-staff.model';

@Component({
  selector: 'app-assign-task-modal',
  templateUrl: './assign-task-modal.component.html',
  styleUrls: ['./assign-task-modal.component.css']
})
export class AssignTaskModalComponent implements OnInit, OnChanges {
  @Input() showModal = false;
  @Input() preSelectedStaffId?: string;

  @Output() close = new EventEmitter<void>();
  @Output() assigned = new EventEmitter<void>();

  isAssigning = false;
  taskError = '';

  staffOptions: { label: string, value: string }[] = [];
  
  taskForm = {
    title: '',
    description: '',
    assignedStaffId: '',
    priority: TaskPriority.MEDIUM
  };

  priorityOptions = [
    { label: 'Low', value: TaskPriority.LOW },
    { label: 'Medium', value: TaskPriority.MEDIUM },
    { label: 'High', value: TaskPriority.HIGH },
    { label: 'Urgent', value: TaskPriority.URGENT }
  ];

  constructor(
    private hospitalStaffService: HospitalStaffService,
    private taskService: TaskService
  ) {}

  ngOnInit(): void {
    this.loadStaff();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal'] && changes['showModal'].currentValue) {
      this.resetForm();
    }
  }

  get preSelectedStaffName(): string {
    const staff = this.staffOptions.find(o => o.value === this.preSelectedStaffId);
    return staff ? staff.label : 'Selected Staff User';
  }

  private loadStaff(): void {
    this.hospitalStaffService.getMyStaff().subscribe((staffList: StaffMember[]) => {
      this.staffOptions = (staffList || [])
        .filter((staff: StaffMember) => (staff.role === 'NURSE' || staff.role === 'DOCTOR') && staff.status === 'ACTIVE')
        .map((staff: StaffMember) => ({
          label: `${staff.firstName} ${staff.lastName} (${staff.role.charAt(0) + staff.role.slice(1).toLowerCase()})`,
          value: staff.id
        }));
        
      // Ensure the preselected staff is set if they exist in the options
      if (this.preSelectedStaffId && this.staffOptions.some(opt => opt.value === this.preSelectedStaffId)) {
        this.taskForm.assignedStaffId = this.preSelectedStaffId;
      }
    });
  }

  private resetForm(): void {
    this.taskForm = {
      title: '',
      description: '',
      assignedStaffId: this.preSelectedStaffId || '',
      priority: TaskPriority.MEDIUM
    };
    this.taskError = '';
    this.isAssigning = false;
  }

  closeModal(): void {
    if (this.isAssigning) return;
    this.close.emit();
  }

  submitTask(): void {
    if (!this.taskForm.title || !this.taskForm.assignedStaffId) {
      this.taskError = 'Please fill in the title and select a staff member.';
      return;
    }

    this.isAssigning = true;
    this.taskError = '';
    
    this.taskService.createTask({
      title: this.taskForm.title,
      description: this.taskForm.description,
      assignedStaffId: this.taskForm.assignedStaffId,
      priority: this.taskForm.priority as TaskPriority,
      status: TaskStatus.PENDING,
      origin: 'ADMIN'
    }).subscribe({
      next: () => {
        this.isAssigning = false;
        this.assigned.emit();
        this.closeModal();
      },
      error: () => {
        this.isAssigning = false;
        this.taskError = 'Failed to assign task. Please try again.';
      }
    });
  }
}