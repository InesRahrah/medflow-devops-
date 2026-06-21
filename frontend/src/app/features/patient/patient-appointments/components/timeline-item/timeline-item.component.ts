import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-timeline-item',
  templateUrl: './timeline-item.component.html',
  styleUrls: ['./timeline-item.component.css'],
  inputs: ['isTelemedicine', 'canJoin', 'joinAvailableAtLabel', 'hasDirectJoinLink'],
  outputs: ['join', 'openDirectLink'],
})
export class TimelineItemComponent {
  @Input() timeline = true;
  @Input() important = false;
  @Input() allowManageActions = true;
  @Input() active = false;

  @Input() doctorName = '';
  @Input() timeLabel = '';
  @Input() typeLabel = '';
  @Input() isTelemedicine = false;
  @Input() canJoin = false;
  @Input() joinAvailableAtLabel = '';
  @Input() hasDirectJoinLink = false;
  @Input() notes = '';
  @Input() status: 'scheduled' | 'completed' | 'pending_doctor_confirmation' | 'cancelled' | 'rejected_by_doctor' = 'scheduled';
  @Input() statusLabel = 'Scheduled';

  @Output() view = new EventEmitter<void>();
  @Output() join = new EventEmitter<void>();
  @Output() openDirectLink = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() select = new EventEmitter<void>();

  get statusClass(): string {
    switch (this.status) {
      case 'completed':
        return 'status-completed';
      case 'pending_doctor_confirmation':
        return 'status-pending';
      case 'scheduled':
        return 'status-scheduled';
      case 'cancelled':
        return 'status-cancelled';
      case 'rejected_by_doctor':
        return 'status-rejected';
      default:
        return 'status-scheduled';
    }
  }
}
