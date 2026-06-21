import { Component, OnInit } from '@angular/core';
import { TaskService, TaskResponse, TaskStatus, TaskPriority } from '../../../core/services/task.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-nurse-tasks',
  templateUrl: './nurse-tasks.component.html',
  styleUrls: ['./nurse-tasks.component.css']
})
export class NurseTasksComponent implements OnInit {
  tasks: TaskResponse[] = [];
  pendingTasks: TaskResponse[] = [];
  inProgressTasks: TaskResponse[] = [];
  completedTasks: TaskResponse[] = [];
  loading = true;
  error: string | null = null;

  TaskStatus = TaskStatus;
  TaskPriority = TaskPriority;

  constructor(private taskService: TaskService) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.taskService.getMyTasks().subscribe({
      next: (data) => {
        this.tasks = data;
        this.groupTasks();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load tasks. Please try again.';
        this.loading = false;
        console.error('Error loading tasks:', err);
      }
    });
  }

  groupTasks(): void {
    this.pendingTasks = this.tasks.filter(t => t.status === TaskStatus.PENDING);
    this.inProgressTasks = this.tasks.filter(t => t.status === TaskStatus.IN_PROGRESS);
    this.completedTasks = this.tasks.filter(t => t.status === TaskStatus.DONE);
  }

  onDrop(event: CdkDragDrop<TaskResponse[]>, newStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      // Internal reordering
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Moving to a new status column
      const task = event.previousContainer.data[event.previousIndex];
      
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Persist status change to backend
      if (task?.id) {
        this.updateStatus(task.id, newStatus);
      }
    }
  }

  updateStatus(taskId: string, status: TaskStatus): void {
    this.taskService.updateTaskStatus(taskId, status).subscribe({
      next: () => {
        // No full reload needed as item is locally moved, 
        // but can be used to ensure server sync if desired
        console.log(`Task ${taskId} status updated to ${status}`);
      },
      error: (err) => {
        console.error('Error updating task status:', err);
        this.loadTasks(); // Revert on failure
      }
    });
  }

  getProgressColor(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.URGENT: return '#ef4444';
      case TaskPriority.HIGH: return '#f59e0b';
      case TaskPriority.MEDIUM: return '#3b82f6';
      case TaskPriority.LOW: return '#94a3b8';
      default: return '#3b82f6';
    }
  }
}
