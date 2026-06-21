import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, TaskResponse } from '../../../core/services/task.service';

@Component({
  selector: 'app-staff-tasks-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff-tasks-modal.component.html',
  styleUrls: ['./staff-tasks-modal.component.css']
})
export class StaffTasksModalComponent implements OnChanges {
  @Input() showModal = false;
  @Input() staffId = '';
  @Input() staffName = '';
  @Input() tasks: TaskResponse[] = [];
  @Output() close = new EventEmitter<void>();

  isLoading = false;
  errorMessage = '';

  constructor(private taskService: TaskService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal'] && changes['showModal'].currentValue) {
      if (this.tasks && this.tasks.length > 0) {
        // Use tasks provided via Input
        this.isLoading = false;
        this.errorMessage = '';
      } else if (this.staffId) {
        // Fetch tasks from API if not provided via Input
        this.loadTasks();
      }
    }
  }

  loadTasks(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.taskService.getTasksByStaffId(this.staffId).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load tasks for this staff member.';
        this.isLoading = false;
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'DONE': return 'status-done';
      case 'IN_PROGRESS': return 'status-progress';
      case 'PENDING': return 'status-pending';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  }
}
